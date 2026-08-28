'use client';

import { useState, useEffect } from 'react';
import { authStorage, AUTH_CHANGE_EVENT, StoredUser } from '@/lib/auth-storage';

/**
 * Hook to access and stay synchronized with authentication state.
 * Listens for AUTH_CHANGE_EVENT and updates state accordingly.
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Initial sync
    setIsAuthenticated(authStorage.isAuthenticated());
    setUser(authStorage.getUser());
    setIsLoaded(true);

    const handleAuthChange = () => {
      setIsAuthenticated(authStorage.isAuthenticated());
      setUser(authStorage.getUser());
    };

    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
  }, []);

  return {
    isAuthenticated,
    user,
    isLoaded,
    /** Force a refresh of the auth state from storage */
    refresh: () => {
      setIsAuthenticated(authStorage.isAuthenticated());
      setUser(authStorage.getUser());
    },
  };
}
