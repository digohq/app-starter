'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { getConsentPreferences, setConsentPreferences, ConsentPreferences } from '@/lib/consent';

interface CookiePreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CookiePreferencesModal = ({ isOpen, onClose }: CookiePreferencesModalProps) => {
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    if (isOpen) {
      setPreferences(getConsentPreferences());
    }
  }, [isOpen]);

  const handleSave = () => {
    setConsentPreferences(preferences);
    onClose();
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      essential: true,
      analytics: true,
      marketing: true,
    };
    setConsentPreferences(allAccepted);
    setPreferences(allAccepted);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cookie Preferences</DialogTitle>
          <DialogDescription>
            Manage how we use cookies to improve your experience. Essential cookies are required for
            the website to function.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-start justify-between space-x-4">
            <div className="space-y-1">
              <Label className="text-base">Essential Cookies</Label>
              <p className="text-sm text-muted-foreground">
                Required for authentication, security, and basic functionality. These cannot be
                disabled.
              </p>
            </div>
            <Switch checked={true} disabled aria-label="Essential cookies (always on)" />
          </div>

          <Separator />

          <div className="flex items-start justify-between space-x-4">
            <div className="space-y-1">
              <Label className="text-base" htmlFor="analytics-cookies">
                Analytics Cookies
              </Label>
              <p className="text-sm text-muted-foreground">
                Help us understand how you use our platform so we can improve our services.
              </p>
            </div>
            <Switch
              id="analytics-cookies"
              checked={preferences.analytics}
              onCheckedChange={(checked) => setPreferences({ ...preferences, analytics: checked })}
              aria-label="Toggle analytics cookies"
            />
          </div>

          <Separator />

          <div className="flex items-start justify-between space-x-4">
            <div className="space-y-1">
              <Label className="text-base" htmlFor="marketing-cookies">
                Marketing Cookies
              </Label>
              <p className="text-sm text-muted-foreground">
                Used to deliver more relevant advertisements and track performance of our marketing
                campaigns.
              </p>
            </div>
            <Switch
              id="marketing-cookies"
              checked={preferences.marketing}
              onCheckedChange={(checked) => setPreferences({ ...preferences, marketing: checked })}
              aria-label="Toggle marketing cookies"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleSave}>
            Save Preferences
          </Button>
          <Button onClick={handleAcceptAll}>Accept All</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
