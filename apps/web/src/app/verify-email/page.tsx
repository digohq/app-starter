'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authApi } from '@/lib/auth-api';
import { authStorage } from '@/lib/auth-storage';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. Missing verification token.');
        return;
      }

      try {
        await authApi.verifyEmail({ token });
        setStatus('success');
        setMessage(
          'Your email has been verified successfully! You can now use all features of the app.',
        );
        toast.success('Email verified successfully!');

        // Redirect to dashboard or originally requested page after a short delay
        const redirectUrl = searchParams.get('redirect');
        setTimeout(() => {
          router.push(redirectUrl || '/dashboard');
        }, 2000);
      } catch (error: any) {
        setStatus('error');
        const errorMessage =
          error.message ||
          error.response?.data?.message ||
          'Verification failed. The link may be invalid or expired.';
        setMessage(errorMessage);
        toast.error(errorMessage);
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  const handleResend = async () => {
    try {
      await authApi.resendVerification();
      toast.success('Verification email sent! Please check your inbox.');
    } catch (error: any) {
      const errorMessage =
        error.message || error.response?.data?.message || 'Failed to resend verification email.';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
            {status === 'success' && <CheckCircle2 className="h-6 w-6 text-green-600" />}
            {status === 'error' && <XCircle className="h-6 w-6 text-destructive" />}
          </div>
          <CardTitle>
            {status === 'loading' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'error' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                If your verification link has expired, you can request a new one.
              </p>
              {authStorage.isAuthenticated() && (
                <Button onClick={handleResend} className="w-full" variant="outline">
                  <Mail className="mr-2 h-4 w-4" />
                  Resend Verification Email
                </Button>
              )}
              <Button
                onClick={() => router.push(authStorage.isAuthenticated() ? '/dashboard' : '/')}
                className="w-full"
                variant="secondary"
              >
                {authStorage.isAuthenticated() ? 'Go to Dashboard' : 'Go to Home'}
              </Button>
            </div>
          )}
          {status === 'success' && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
