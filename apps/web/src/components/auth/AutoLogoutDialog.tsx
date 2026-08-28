'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LogOut, AlertTriangle } from 'lucide-react';
import { authStorage } from '@/lib/auth-storage';

const AUTO_LOGOUT_EVENT = 'auto-logout-required';

/**
 * Global dialog component that listens for auto-logout events
 * and shows a confirmation dialog before redirecting to login
 */
export function AutoLogoutDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleAutoLogout = () => {
      setOpen(true);
    };

    // Listen for auto-logout events
    window.addEventListener(AUTO_LOGOUT_EVENT, handleAutoLogout);

    return () => {
      window.removeEventListener(AUTO_LOGOUT_EVENT, handleAutoLogout);
    };
  }, []);

  const handleConfirm = () => {
    // Clear auth storage
    authStorage.clear();
    // Redirect to home page (login page)
    router.push('/login');
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <LogOut className="h-5 w-5 text-destructive" />
            </div>
            <span>Session Expired</span>
          </AlertDialogTitle>
          <AlertDialogDescription className="pt-2">
            Your session has expired or is no longer valid. You will be automatically logged out for
            security reasons.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="bg-muted/50 p-4 rounded-lg border">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Why is this happening?</p>
              <p>
                This usually occurs when your account has been removed, your session has expired, or
                there was an authentication error. Please log in again to continue.
              </p>
            </div>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleConfirm} className="w-full sm:w-auto">
            <LogOut className="h-4 w-4 mr-2" />
            Continue to Login
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Utility function to trigger the auto-logout dialog
 * This should be called from non-React code (like api-client.ts)
 */
export function triggerAutoLogout() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTO_LOGOUT_EVENT));
  }
}
