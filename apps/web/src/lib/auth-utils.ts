'use client';

import { authApi } from './auth-api';
import { authStorage } from './auth-storage';

/**
 * Logout the current user
 * Clears tokens, calls the logout API, and redirects to home
 */
export async function logout(): Promise<void> {
  try {
    // Call logout API (may fail if token is invalid, but that's okay)
    await authApi.logout();
  } catch (error) {
    // Ignore errors - we still want to clear local storage
    console.warn('Logout API call failed:', error);
  } finally {
    // Always clear local storage
    authStorage.clear();

    // Redirect to home page
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }
}

/**
 * Redirect user after successful authentication
 * Checks for redirect query parameter first, otherwise redirects to dashboard
 */
export async function redirectAfterAuth(redirectParam?: string | null): Promise<string> {
  // If redirect parameter is provided and valid, use it
  if (redirectParam) {
    try {
      const decoded = decodeURIComponent(redirectParam);
      // Validate that it's a relative path (security check)
      if (decoded.startsWith('/') && !decoded.startsWith('//')) {
        return decoded;
      }
    } catch (error) {
      console.warn('Invalid redirect parameter:', error);
    }
  }

  // Default behavior: redirect to dashboard
  return '/dashboard';
}
