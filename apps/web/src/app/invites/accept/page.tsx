'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AcceptInviteForm } from '@/components/invites/AcceptInviteForm';
import { InviteInfoCard } from '@/components/invites/InviteInfoCard';
import { organizationsApi } from '@/lib/organizations-api';
import { authStorage } from '@/lib/auth-storage';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(true);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    const verifyToken = searchParams.get('verify');

    // If there's a verify token, redirect to verify page
    if (tokenParam && verifyToken) {
      router.push(`/invites/verify?token=${tokenParam}&verify=${verifyToken}`);
      return;
    }

    if (!tokenParam) {
      toast.error('Invalid invitation link');
      router.push('/login');
      return;
    }

    setToken(tokenParam);
    setIsAuthenticated(authStorage.isAuthenticated());

    // Fetch invite details to check if it was sent via email
    const fetchInviteDetails = async () => {
      try {
        const inviteDetails = await organizationsApi.getInviteByToken(tokenParam);
        setInviteEmail(inviteDetails.email);
      } catch (error) {
        const apiError = error as { message?: string };
        toast.error(apiError.message || 'Failed to load invitation details');
      } finally {
        setIsLoadingInvite(false);
        setIsLoading(false);
      }
    };

    fetchInviteDetails();
  }, [searchParams, router]);

  const handleAccept = async (inviteToken: string) => {
    const response = await organizationsApi.acceptInvite({ token: inviteToken });
    toast.success(response.message);
    router.push('/dashboard');
  };

  const handleSubmitEmail = async (
    inviteToken: string,
    data: { name: string; email: string; confirmEmail: string },
  ) => {
    await organizationsApi.submitEmailForInvite(inviteToken, data);
    toast.success('Verification email sent! Please check your inbox.');
  };

  const handleSuccess = () => {
    // This is called after successful email submission
    // The form will show the success message
  };

  if (isLoading || isLoadingInvite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading invitation...
        </div>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  // If invite was sent via email, show message to check email
  if (inviteEmail && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Organization Invitation</h1>
            <p className="text-muted-foreground">This invitation was sent to {inviteEmail}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Check Your Email</CardTitle>
              <CardDescription>
                Please check your email inbox for a verification link. Click the link in the email
                to accept the invitation and automatically sign in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                If you didn't receive the email, please check your spam folder or contact the person
                who invited you.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Organization Invitation</h1>
          <p className="text-muted-foreground">
            {isAuthenticated
              ? 'Click below to accept this invitation and join the organization.'
              : 'Enter your information to accept this invitation.'}
          </p>
        </div>

        <InviteInfoCard />

        <Card>
          <CardHeader>
            <CardTitle>Accept Invitation</CardTitle>
            <CardDescription>
              {isAuthenticated
                ? 'You will be added to the organization with editor permissions.'
                : 'We will send you a verification email to complete the process.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AcceptInviteForm
              token={token}
              isAuthenticated={isAuthenticated}
              onSuccess={handleSuccess}
              onAccept={handleAccept}
              onSubmitEmail={handleSubmitEmail}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
