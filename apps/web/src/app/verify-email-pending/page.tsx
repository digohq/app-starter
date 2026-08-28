'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/auth-api';
import { authStorage } from '@/lib/auth-storage';
import { toast } from 'sonner';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function VerifyEmailPendingPage() {
  const router = useRouter();
  const [isResending, setIsResending] = useState(false);
  const user = authStorage.getUser();

  const handleResend = async () => {
    setIsResending(true);
    try {
      await authApi.resendVerification();
      toast.success('Verification email sent! Please check your inbox.');
    } catch (error: any) {
      const errorMessage =
        error.message || error.response?.data?.message || 'Failed to resend verification email.';
      toast.error(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a verification link to {user?.email || 'your email address'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Please check your email and click the verification link to activate your account.</p>
            <p>The link will expire in 24 hours.</p>
          </div>
          <div className="space-y-2">
            <Button onClick={handleResend} className="w-full" disabled={isResending}>
              <Mail className="mr-2 h-4 w-4" />
              {isResending ? 'Sending...' : 'Resend Verification Email'}
            </Button>
            <Button onClick={() => router.push('/dashboard')} className="w-full" variant="outline">
              Continue to Dashboard
            </Button>
            <Link href="/">
              <Button className="w-full" variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
