import { ApiError } from '@app-starter/shared';
import { authStorage } from './auth-storage';
import { triggerAutoLogout } from '@/components/auth/AutoLogoutDialog';

// Re-export ApiError for convenience
export type { ApiError };

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Attempt to refresh the access token using the refresh token
   * Returns true if refresh was successful, false otherwise
   *
   * Note: This makes a direct fetch call to avoid circular dependency
   * with apiClient which would trigger another refresh attempt
   */
  private async refreshAccessToken(): Promise<boolean> {
    // If already refreshing, wait for that promise
    if (this.isRefreshing && this.refreshPromise) {
      await this.refreshPromise;
      return true;
    }

    // Start new refresh
    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshToken = authStorage.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Make direct fetch call to avoid circular dependency
        const url = `${this.baseUrl}/api/auth/refresh`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
          credentials: 'include',
        });

        const data = await response.json();

        if (!response.ok) {
          // If refresh endpoint returns 401, user doesn't exist or token is invalid
          // Only trigger auto-logout if user was actually logged in
          if (response.status === 401 && authStorage.isAuthenticated()) {
            triggerAutoLogout();
          }
          throw new Error(data.message || 'Token refresh failed');
        }

        // Update stored tokens with new tokens (refresh token rotation)
        authStorage.setTokens(data.accessToken, data.refreshToken);
        authStorage.setUser(data.user);

        return;
      } catch (error) {
        // Do not trigger auto-logout here; request() will trigger when appropriate
        // (e.g. not for optional endpoints like /api/sponsors/access)
        throw error;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    try {
      await this.refreshPromise;
      return true;
    } catch {
      return false;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOn401 = true,
    serverCookieHeader?: string | null,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Log for debugging server-side requests (only in development)
    if (process.env.NODE_ENV === 'development' && typeof window === 'undefined') {
      console.log('[Server API Request]', {
        method: options.method || 'GET',
        url,
        baseUrl: this.baseUrl,
        endpoint,
      });
    }

    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    };

    // Only set Content-Type if not FormData (FormData needs boundary)
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Automatically include access token from storage if available
    let accessToken = authStorage.getAccessToken();

    // On server, try to get token from cookies if not available from localStorage
    if (!accessToken && serverCookieHeader) {
      accessToken = authStorage.getAccessTokenFromCookie(serverCookieHeader);
    }

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
      credentials: 'include',
    };

    try {
      const response = await fetch(url, config);

      // Check content type to determine if response is JSON
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      let data: any;
      try {
        data = isJson ? await response.json() : await response.text();
      } catch (parseError) {
        // If JSON parsing fails, try to get text response
        try {
          data = await response.text();
        } catch {
          data = null;
        }
      }

      if (!response.ok) {
        // Handle 401 Unauthorized - try to refresh token
        if (response.status === 401 && retryOn401 && endpoint !== '/api/auth/refresh') {
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            // Retry the original request with new token
            return this.request<T>(endpoint, options, false, serverCookieHeader);
          } else {
            // Refresh failed - trigger auto-logout dialog only if user was logged in
            // Don't show for login/signup or optional UI endpoints (e.g. sponsor access check)
            if (typeof window !== 'undefined' && authStorage.isAuthenticated()) {
              const isAuthEndpoint =
                endpoint.includes('/api/auth/login') ||
                endpoint.includes('/api/auth/signup') ||
                endpoint.includes('/api/auth/otp');
              const isOptionalEndpoint = endpoint.includes('/api/sponsors/access');
              if (!isAuthEndpoint && !isOptionalEndpoint) {
                const hasTriggered = (window as any).__autoLogoutTriggered;
                if (!hasTriggered) {
                  (window as any).__autoLogoutTriggered = true;
                  triggerAutoLogout();
                  // Reset flag after a delay to allow for future logouts
                  setTimeout(() => {
                    (window as any).__autoLogoutTriggered = false;
                  }, 1000);
                }
              }
            }
            // Throw the 401 error so caller knows authentication failed
            const error: ApiError = {
              message: data?.message || 'Authentication failed. Please log in again.',
              statusCode: 401,
            };
            throw error;
          }
        }

        // Extract error message from various formats
        let errorMessage = 'An error occurred';

        if (data) {
          if (typeof data === 'string') {
            // If data is a string, use it as the message
            errorMessage = data;
          } else if (typeof data === 'object') {
            // Try to extract message from common error formats
            if (Array.isArray(data.message)) {
              // NestJS validation errors often have message as an array
              errorMessage = data.message.join(', ');
            } else if (typeof data.message === 'string') {
              errorMessage = data.message;
            } else if (data.error && typeof data.error === 'string') {
              errorMessage = data.error;
            } else if (data.statusText && typeof data.statusText === 'string') {
              errorMessage = data.statusText;
            }
          }
        }

        const error: ApiError = {
          message: errorMessage,
          statusCode: response.status,
        };
        throw error;
      }

      return data as T;
    } catch (error) {
      // If it's already an ApiError, re-throw it
      if (error && typeof error === 'object' && 'statusCode' in error && 'message' in error) {
        throw error;
      }

      // Try to extract message from Error objects
      if (error instanceof Error) {
        // Check if the error message contains useful information
        const errorMessage = error.message;
        if (
          errorMessage &&
          errorMessage !== 'Network error' &&
          !errorMessage.includes('Failed to fetch')
        ) {
          throw {
            message: errorMessage,
            statusCode: 0,
          } as ApiError;
        }
      }

      // Fallback to generic network error
      throw {
        message: 'Network error. Please check your connection.',
        statusCode: 0,
      } as ApiError;
    }
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const body = data instanceof FormData ? data : JSON.stringify(data);

    return this.request<T>(endpoint, {
      method: 'POST',
      body,
    });
  }

  async get<T>(
    endpoint: string,
    serverCookieHeader?: string | null,
    options?: RequestInit,
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'GET',
        ...options,
      },
      true,
      serverCookieHeader,
    );
  }

  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    const body = data instanceof FormData ? data : JSON.stringify(data);

    return this.request<T>(endpoint, {
      method: 'PATCH',
      body,
    });
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    const body = data instanceof FormData ? data : JSON.stringify(data);

    return this.request<T>(endpoint, {
      method: 'PUT',
      body,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
