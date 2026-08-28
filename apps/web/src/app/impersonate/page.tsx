'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authStorage } from '@/lib/auth-storage';
import { usersApi } from '@/lib/users-api';
import { Loader2 } from 'lucide-react';

/**
 * Consumes a short-lived impersonation token from the query (e.g. from admin dashboard "Log in as").
 * Sets the token in auth storage, fetches the user profile, and redirects to home.
 * This page is opened in a new tab; the admin session in the original tab is unchanged.
 */
export default function ImpersonatePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const applyToken = async () => {
      const token = searchParams.get('token');
      if (!token?.trim()) {
        setStatus('error');
        setErrorMessage('Missing token.');
        return;
      }

      try {
        authStorage.setTokens(token.trim(), '');
        const userProfile = await usersApi.getUserProfile();
        authStorage.setUser({
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.name ?? null,
          username: userProfile.username ?? null,
          avatarUrl: userProfile.avatarUrl ?? null,
        });
        router.replace('/');
      } catch {
        setStatus('error');
        setErrorMessage(
          'Invalid or expired token. You may need to request a new link from the admin.',
        );
      }
    };

    applyToken();
  }, [searchParams, router]);

  if (status === 'error') {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4">
        <p className="text-sm text-destructive">{errorMessage}</p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="text-sm font-medium text-primary underline"
        >
          Go to home
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Signing you in…</span>
      </div>
    </div>
  );
}
