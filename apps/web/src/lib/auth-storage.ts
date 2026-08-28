const ACCESS_TOKEN_KEY = 'app_starter_access_token';
const REFRESH_TOKEN_KEY = 'app_starter_refresh_token';
const USER_KEY = 'app_starter_user';
const LAST_EMAIL_KEY = 'app_starter_last_email';

/** Dispatched when auth state changes (login/logout) so UI can sync without remount. */
export const AUTH_CHANGE_EVENT = 'app-starter:auth-change';

export interface StoredUser {
  id: string;
  email: string;
  name: string | null;
  googleId?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  defaultCalendarId?: string;
  defaultCalendarSlug?: string;
}

export class AuthStorage {
  setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

      // Also set cookies for server-side access
      // Set cookie with 7 days expiration (same as typical refresh token)
      const expires = new Date();
      expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000);
      document.cookie = `${ACCESS_TOKEN_KEY}=${accessToken}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
      document.cookie = `${REFRESH_TOKEN_KEY}=${refreshToken}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

      window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT));
    }
  }

  getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    }
    // On server, try to read from cookies
    // This will be called from api-client which runs on server
    // We'll need to pass cookies from the Server Component
    return null;
  }

  /**
   * Get access token from cookie string (for server-side use)
   */
  getAccessTokenFromCookie(cookieHeader: string | null): string | null {
    if (!cookieHeader) return null;

    // Handle both formats: "name=value; name2=value2" and array of cookie objects
    const cookies: Record<string, string> = {};

    // If it's already a parsed object (from Next.js cookies().getAll())
    if (typeof cookieHeader === 'object' && !Array.isArray(cookieHeader)) {
      return cookieHeader[ACCESS_TOKEN_KEY] || null;
    }

    // Parse cookie string
    const cookieString = Array.isArray(cookieHeader)
      ? cookieHeader.map((c: any) => `${c.name}=${c.value}`).join('; ')
      : cookieHeader;

    cookieString.split(';').forEach((cookie) => {
      const [key, ...valueParts] = cookie.trim().split('=');
      if (key && valueParts.length > 0) {
        cookies[key] = decodeURIComponent(valueParts.join('='));
      }
    });

    return cookies[ACCESS_TOKEN_KEY] || null;
  }

  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return null;
  }

  setUser(user: StoredUser): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT));
    }
  }

  getUser(): StoredUser | null {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem(USER_KEY);
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  clear(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);

      // Also clear cookies
      document.cookie = `${ACCESS_TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${REFRESH_TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;

      window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT));
    }
  }

  isAuthenticated(): boolean {
    return this.getAccessToken() !== null;
  }

  setLastEmail(email: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_EMAIL_KEY, email);
    }
  }

  getLastEmail(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LAST_EMAIL_KEY);
    }
    return null;
  }

  clearLastEmail(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LAST_EMAIL_KEY);
    }
  }
}

export const authStorage = new AuthStorage();
