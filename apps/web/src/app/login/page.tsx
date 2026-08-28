'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LandingHero from '@/components/landing/LandingHero';
import { AuthCard } from '@/components/landing/AuthCard';
import { authStorage } from '@/lib/auth-storage';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get('tab');
  const initialMode = tab === 'signup' ? 'signup' : 'login';
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    if (authStorage.isAuthenticated()) {
      // Redirect based on params if logged in
      const intent = searchParams.get('intent');
      const redirect = searchParams.get('redirect');

      if (redirect) {
        router.push(redirect);
      } else if (intent === 'presentation') {
        router.push('/create-topic?from=login');
      } else if (intent === 'calendar') {
        router.push('/organizations/create');
      } else if (intent === 'collaboration') {
        router.push('/events/create');
      } else {
        router.push('/dashboard');
      }
    } else {
      // Show login page if not authenticated
      setIsCheckingAuth(false);
    }
  }, [router]);

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <main className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </main>
    );
  }

  // Only show login/signup if not authenticated
  return (
    <main className="min-h-screen bg-gradient-subtle">
      <LandingHero />
      <div className="container mx-auto px-4 pb-16">
        <AuthCard initialMode={initialMode} />
      </div>
    </main>
  );
}
