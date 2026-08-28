'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { authStorage, AUTH_CHANGE_EVENT } from '@/lib/auth-storage';
import { UnifiedHeader } from './UnifiedHeader';

/**
 * Wraps UnifiedHeader to handle visibility on custom domain white-label calendars.
 *
 * On white-label calendar pages (e.g., event.company.com/ or /calendar), the
 * server-side layout sets isWhiteLabelCalendar=true and hides the header. However,
 * when a user clicks on an event/session card, client-side navigation keeps the
 * same layout context, so the header stays hidden even on detail pages.
 *
 * This component detects when the user has navigated to a detail page (e.g.
 * /events/*, /session/*) from the white-label calendar and shows the header
 * if the user is logged in.
 *
 * Race condition handling:
 * - CookieSync may asynchronously restore auth after initial mount, so we listen
 *   for AUTH_CHANGE_EVENT and also poll authStorage directly on mount.
 * - We debounce the auth-settled state to avoid header flash during rapid
 *   auth state transitions (e.g. CookieSync token refresh).
 * - A short stabilization delay ensures CookieSync has time to complete before
 *   we commit to "not authenticated" on the white-label path.
 */

/** Paths that are considered "detail" pages where the header should appear. */
const DETAIL_PATH_PREFIXES = ['/events/', '/session/', '/calendar/'];

/** Time (ms) to wait for CookieSync to settle before finalizing auth state. */
const AUTH_SETTLE_DELAY_MS = 150;

export function CustomDomainHeaderWrapper({
  isWhiteLabelCalendar,
  customLogoUrl,
  logoHeight,
}: {
  isWhiteLabelCalendar: boolean;
  customLogoUrl?: string | null;
  logoHeight?: number | null;
}) {
  const pathname = usePathname();

  // For non-white-label pages we skip auth checks entirely — always show header.
  // This avoids any unnecessary auth-related flash on normal pages.
  if (!isWhiteLabelCalendar) {
    return <UnifiedHeader customLogoUrl={customLogoUrl} logoHeight={logoHeight} />;
  }

  // Delegate to a separate component so hooks are called unconditionally
  // (the early return above is fine because it's consistent per render).
  return (
    <WhiteLabelHeaderResolver
      pathname={pathname}
      customLogoUrl={customLogoUrl}
      logoHeight={logoHeight}
    />
  );
}

/**
 * Internal component that resolves header visibility for white-label calendar pages.
 * Handles async auth (CookieSync) with a settle delay to avoid flash.
 */
function WhiteLabelHeaderResolver({
  pathname,
  customLogoUrl,
  logoHeight,
}: {
  pathname: string;
  customLogoUrl?: string | null;
  logoHeight?: number | null;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const syncAuth = useCallback(() => {
    setIsAuthenticated(authStorage.isAuthenticated());
  }, []);

  useEffect(() => {
    // Immediately read current auth state from storage
    const currentAuth = authStorage.isAuthenticated();

    if (currentAuth) {
      // Already authenticated — no need to wait
      setIsAuthenticated(true);
    } else {
      // Not yet authenticated — CookieSync may still be restoring a session.
      // Wait a short period to let it settle before committing to "not authenticated".
      const settleTimer = setTimeout(() => {
        setIsAuthenticated(authStorage.isAuthenticated());
      }, AUTH_SETTLE_DELAY_MS);

      // If AUTH_CHANGE_EVENT fires before the timer, use that immediately
      const handleEarlyAuth = () => {
        clearTimeout(settleTimer);
        setIsAuthenticated(authStorage.isAuthenticated());
      };

      window.addEventListener(AUTH_CHANGE_EVENT, handleEarlyAuth);

      return () => {
        clearTimeout(settleTimer);
        window.removeEventListener(AUTH_CHANGE_EVENT, handleEarlyAuth);
      };
    }

    // Listen for ongoing auth changes (login, logout, token refresh)
    const handleAuthChange = () => {
      setIsAuthenticated(authStorage.isAuthenticated());
    };

    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    };
  }, []);

  const isDetailPage = DETAIL_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // While auth is still settling (null), don't render the header to avoid flash
  if (isAuthenticated === null || !isDetailPage || !isAuthenticated) {
    return null;
  }

  return <UnifiedHeader customLogoUrl={customLogoUrl} logoHeight={logoHeight} />;
}
