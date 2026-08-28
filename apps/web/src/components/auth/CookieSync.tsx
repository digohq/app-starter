'use client';

import { useEffect } from 'react';
import { authStorage } from '@/lib/auth-storage';
import { authApi } from '@/lib/auth-api';

/**
 * Client component that syncs authentication state across domains and between
 * localStorage and cookies.
 *
 * 1. If not authenticated in localStorage, attempts to refresh session using
 *    HTTP-only cookies from the API domain (enabling cross-domain auth).
 * 2. If already authenticated, ensures cookies are synced for server-side requests.
 */
export function CookieSync() {
  useEffect(() => {
    const syncSession = async () => {
      // 1. Check if we have tokens in localStorage
      const accessToken = authStorage.getAccessToken();
      const refreshToken = authStorage.getRefreshToken();

      if (!accessToken || !refreshToken) {
        // Not authenticated locally - try to refresh from API cookies
        // (This happens when visiting a new custom domain for the first time)
        try {
          // Silent refresh call
          const data = await authApi.refreshToken({});

          // CRITICAL: We must manually store the tokens and user info returned from the sync
          if (data.accessToken && data.refreshToken && data.user) {
            authStorage.setTokens(data.accessToken, data.refreshToken);
            authStorage.setUser(data.user);
            console.log('Session synchronized from cookies');
          }
        } catch (error) {
          // Silently fail - means no valid session cookie exists
          // console.debug('No session cookie found for synchronization');
        }
      } else {
        // Already authenticated locally - ensure cookies are synced for SSR
        // This handles cases where localStorage is present but cookies might be missing
        authStorage.setTokens(accessToken, refreshToken);
      }
    };

    syncSession();
  }, []);

  return null;
}
