'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, User } from 'lucide-react';
import { usersApi, UserProfileResponse, UpdateUserProfileRequest } from '@/lib/users-api';
import { authStorage } from '@/lib/auth-storage';
import { UserProfileForm } from '@/components/users/UserProfileForm';

export default function EditUserProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!authStorage.isAuthenticated()) {
        router.push('/login');
        return;
      }

      try {
        setIsLoading(true);
        const profileData = await usersApi.getUserProfile();
        setProfile(profileData);
      } catch (error) {
        const apiError = error as { message?: string; statusCode?: number };
        if (apiError.statusCode === 404) {
          toast.error('Profile not found');
        } else {
          toast.error(apiError.message || 'Failed to load profile');
        }
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const onUpdate = async (data: UpdateUserProfileRequest) => {
    try {
      setIsSaving(true);
      // The form data structure matches the API somewhat but socialLinks is flat in form, handled by component
      // But we passed onUpdate callback - let's verify what UserProfileForm passes.
      // UserProfileForm reconstructs socialLinks before calling onUpdate.

      const updated = await usersApi.updateUserProfile(data);
      setProfile(updated);

      // Update auth storage with new user data
      const currentUser = authStorage.getUser();
      if (currentUser) {
        authStorage.setUser({
          ...currentUser,
          name: updated.name || currentUser.name,
          email: updated.email || currentUser.email,
          avatarUrl: updated.avatarUrl !== undefined ? updated.avatarUrl : currentUser.avatarUrl,
        });
      }

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error(error);
      const apiError = error as { message?: string };
      toast.error(apiError.message || 'Failed to update profile');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Edit Profile</h1>
              <p className="text-sm text-muted-foreground">
                Update your account and speaker information
              </p>
            </div>
          </div>
        </div>

        {profile && <UserProfileForm user={profile} onUpdate={onUpdate} isSaving={isSaving} />}
      </div>
    </div>
  );
}
