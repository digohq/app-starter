'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import VerificationStatus from '@/components/invites/VerificationStatus';
import { organizationsApi } from '@/lib/organizations-api';
import { authStorage } from '@/lib/auth-storage';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function VerifyInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const [organizationName, setOrganizationName] = useState<string>();
  const [organizationSlug, setOrganizationSlug] = useState<string>();

  useEffect(() => {
    const verifyInvitation = async () => {
      const inviteToken = searchParams.get('token');
      const verifyToken = searchParams.get('verify');

      if (!inviteToken || !verifyToken) {
        setStatus('error');
        setMessage('Invalid verification link. Missing required parameters.');
        return;
      }

      try {
        const response = await organizationsApi.verifyAndAcceptInvite({
          inviteToken,
          verifyToken,
        });

        // Store auth token and user info
        authStorage.setTokens(response.authToken, ''); // Refresh token not provided in this flow
        authStorage.setUser({
          id: response.user.id,
          email: response.user.email,
          name: response.user.name,
        });

        setOrganizationName(response.organization.name);
        setOrganizationSlug(response.organization.slug);
        setMessage(response.message);
        setStatus('success');
        toast.success(response.message);
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

    verifyInvitation();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <VerificationStatus
          status={status}
          message={message}
          organizationName={organizationName}
          organizationSlug={organizationSlug}
          onRedirect={() => {
            router.push('/dashboard');
          }}
        />
      </div>
    </div>
  );
}
