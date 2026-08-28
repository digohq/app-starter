'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { authApi } from '@/lib/auth-api';
import { Loader2 } from 'lucide-react';

interface GoogleAuthButtonProps {
  mode: 'signup' | 'login';
  invitationToken?: string;
  returnUrl?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export function GoogleAuthButton({
  mode,
  invitationToken,
  returnUrl,
  disabled = false,
  className,
  label,
}: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleAuth = () => {
    setIsLoading(true);
    try {
      let state: string | undefined;
      if (invitationToken) {
        state = `invitation:${invitationToken}`;
      } else if (returnUrl) {
        state = `returnUrl:${returnUrl}`;
      }
      authApi.initiateGoogleAuth(state);
    } catch (error) {
      console.error('Google auth initiation failed:', error);
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      className={`w-full ${className}`}
      onClick={handleGoogleAuth}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <GoogleIcon className="mr-2 h-4 w-4" />
      )}
      {isLoading
        ? 'Connecting...'
        : label || `${mode === 'signup' ? 'Sign up' : 'Sign in'} with Google`}
    </Button>
  );
}
