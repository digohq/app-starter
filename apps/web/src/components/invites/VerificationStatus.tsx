'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface VerificationStatusProps {
  status: 'loading' | 'success' | 'error';
  message?: string;
  organizationName?: string;
  organizationSlug?: string;
  onRedirect?: () => void;
}

export default function VerificationStatus({
  status,
  message,
  organizationName,
  organizationSlug,
  onRedirect,
}: VerificationStatusProps) {
  const router = useRouter();

  useEffect(() => {
    if (status === 'success') {
      // Auto-redirect after 3 seconds
      const timer = setTimeout(() => {
        if (onRedirect) {
          onRedirect();
        } else {
          router.push('/dashboard');
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [status, router, onRedirect]);

  if (status === 'loading') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Verifying your invitation...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please wait while we process your invitation.</p>
        </CardContent>
      </Card>
    );
  }

  if (status === 'success') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-success">
            <CheckCircle2 className="h-5 w-5" />
            Success!
          </CardTitle>
          <CardDescription>
            {message || `You've been added to ${organizationName || 'the organization'}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Redirecting you to the dashboard...</p>
          <Button
            onClick={() => {
              if (onRedirect) {
                onRedirect();
              } else {
                router.push('/dashboard');
              }
            }}
            className="w-full"
          >
            Go to Dashboard Now
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Error state
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <XCircle className="h-5 w-5" />
          Verification Failed
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-destructive mb-4">
          {message || 'This verification link is invalid or has expired.'}
        </p>
        <Button onClick={() => router.push('/')} variant="outline" className="w-full">
          Return to Home
        </Button>
      </CardContent>
    </Card>
  );
}
