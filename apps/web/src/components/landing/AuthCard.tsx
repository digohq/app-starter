'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { SignUpForm } from './SignUpForm';
import { LoginForm } from './LoginForm';

interface AuthCardProps {
  initialMode?: 'signup' | 'login';
}

export function AuthCard({ initialMode = 'login' }: AuthCardProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get('tab');
  const redirectParam = searchParams.get('redirect');
  const emailParam = searchParams.get('email');
  const [mode, setMode] = useState<'signup' | 'login'>(tab === 'signup' ? 'signup' : initialMode);

  // Update mode when tab query param changes
  useEffect(() => {
    if (tab === 'signup') {
      setMode('signup');
    } else if (tab === 'login') {
      setMode('login');
    }
  }, [tab]);

  const intentParam = searchParams.get('intent');

  const handleSwitchToLogin = () => {
    setMode('login');
    // Update URL to preserve redirect and email parameters
    const params = new URLSearchParams();
    params.set('tab', 'login');
    if (redirectParam) {
      params.set('redirect', redirectParam);
    }
    if (emailParam) {
      params.set('email', emailParam);
    }
    if (intentParam) {
      params.set('intent', intentParam);
    }
    router.push(`/login?${params.toString()}`);
  };

  const handleSwitchToSignup = () => {
    setMode('signup');
    // Update URL to preserve redirect and email parameters
    const params = new URLSearchParams();
    params.set('tab', 'signup');
    if (redirectParam) {
      params.set('redirect', redirectParam);
    }
    if (emailParam) {
      params.set('email', emailParam);
    }
    if (intentParam) {
      params.set('intent', intentParam);
    }
    router.push(`/login?${params.toString()}`);
  };

  // Calculate effective return URL for Google Auth
  let googleReturnUrl = redirectParam || undefined;
  if (!googleReturnUrl && intentParam === 'presentation') {
    googleReturnUrl = '/create-topic?from=login';
  } else if (!googleReturnUrl && intentParam === 'calendar') {
    googleReturnUrl = '/organizations/create';
  } else if (!googleReturnUrl && intentParam === 'collaboration') {
    googleReturnUrl = '/events/create';
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{mode === 'signup' ? 'Create Account' : 'Sign In'}</CardTitle>
      </CardHeader>
      <CardContent>
        {mode === 'signup' ? (
          <>
            <div className="mb-4">
              <GoogleAuthButton mode="signup" className="mb-4" returnUrl={googleReturnUrl} />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
            </div>
            <SignUpForm key="signup" onSwitchToLogin={handleSwitchToLogin} />
          </>
        ) : (
          <>
            <div className="mb-4">
              <GoogleAuthButton mode="login" className="mb-4" returnUrl={googleReturnUrl} />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
            </div>
            <LoginForm key="login" onSwitchToSignup={handleSwitchToSignup} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
