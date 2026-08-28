'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { authStorage } from '@/lib/auth-storage';
import { toast } from 'sonner';

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const accessToken = searchParams.get('accessToken');
      const refreshToken = searchParams.get('refreshToken');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError(errorParam);
        return;
      }

      if (accessToken && refreshToken) {
        try {
          // Store tokens first to allow API calls
          authStorage.setTokens(accessToken, refreshToken);

          // Fetch user info to store locally
          const { authApi } = await import('@/lib/auth-api');
          const user = await authApi.getMe();

          // Store full user so profile photo and other fields display without refresh
          authStorage.setUser({
            id: user.id,
            email: user.email,
            name: user.name,
            googleId: user.googleId,
            avatarUrl: user.avatarUrl,
            defaultCalendarId: user.defaultCalendarId,
            defaultCalendarSlug: user.defaultCalendarSlug,
          });

          let redirectUrl = '/dashboard';
          if (state) {
            if (state.startsWith('invitation:')) {
              // Format: invitation:TOKEN
              const token = state.split(':')[1];
              if (token) {
                redirectUrl = `/invites/accept?token=${token}`;
              }
            } else if (state.startsWith('returnUrl:')) {
              // Format: returnUrl:URL
              // We need to be careful about decoding and validating this
              const url = state.substring('returnUrl:'.length);
              if (url && url.startsWith('/')) {
                // Simple security check for relative URLs
                redirectUrl = url;
              }
            }
          }

          toast.success('Successfully signed in with Google');
          router.push(redirectUrl);
        } catch (err) {
          console.error('Failed to complete Google auth:', err);
          setError('Failed to load user profile. Please try again.');
          // If fetching user fails, we should probably clear tokens?
          // But maybe network error. Let's error out for now.
        }
      } else {
        setError('No tokens received from Google authentication');
      }
    };

    processCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-center">Authentication Error</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-destructive/15 text-destructive p-4 rounded-md text-sm font-medium">
            {error}
          </div>
          <div className="mt-4 text-center">
            <button className="text-primary hover:underline" onClick={() => router.push('/login')}>
              Return to Sign In
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto mt-8 border-none shadow-none">
      <CardHeader>
        <CardTitle className="text-center">Completing Sign In</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground text-center">
          Please wait while we log you in...
        </p>
      </CardContent>
    </Card>
  );
}

export function GoogleCallbackHandler() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
        <GoogleCallbackContent />
      </Suspense>
    </div>
  );
}
