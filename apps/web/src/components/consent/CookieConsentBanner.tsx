'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { hasUserMadeChoice, setConsentPreferences } from '@/lib/consent';
import { CookiePreferencesModal } from './CookiePreferencesModal';
import Link from 'next/link';

export const CookieConsentBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Show banner if user hasn't made a choice yet
    if (!hasUserMadeChoice()) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    setConsentPreferences({
      essential: true,
      analytics: true,
      marketing: true,
    });
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    setConsentPreferences({
      essential: true,
      analytics: false,
      marketing: false,
    });
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1 space-y-1">
            <h3 className="text-lg font-semibold">We use cookies to improve your experience</h3>
            <p className="text-sm text-muted-foreground">
              We use essential cookies for authentication and security, and optional analytics
              cookies to understand how you use our platform and improve our services. Learn more in
              our{' '}
              <Link href="/privacy" className="underline hover:text-foreground transition-colors">
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link href="/cookies" className="underline hover:text-foreground transition-colors">
                Cookie Policy
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleRejectAll}>
              Reject All
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)}>
              Customize
            </Button>
            <Button size="sm" onClick={handleAcceptAll}>
              Accept All
            </Button>
          </div>
        </div>
      </div>

      <CookiePreferencesModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          // If modal was closed and choice was made, hide banner
          if (hasUserMadeChoice()) {
            setIsVisible(false);
          }
        }}
      />
    </>
  );
};
