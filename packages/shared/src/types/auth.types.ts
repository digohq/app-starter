/**
 * Authentication-related types
 */

/**
 * User information in auth responses
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  googleId?: string | null;
  avatarUrl?: string | null;
  slug?: string | null;
  defaultCalendarId?: string;
  defaultCalendarSlug?: string;
}

/**
 * Authentication response from login/signup
 */
export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn?: number; // Optional: expiration time in seconds
}

/**
 * JWT token payload structure
 */
export interface TokenPayload {
  sub: string; // user id
  email: string;
  /**
   * True if this token was minted via admin impersonation.
   * Optional for backwards compatibility with existing tokens.
   */
  imp?: true;
  /**
   * Actor identifier for auditing/correlation.
   * Optional for backwards compatibility with existing tokens.
   */
  act?: string;
  /**
   * JWT ID for auditing/correlation.
   * Optional for backwards compatibility with existing tokens.
   */
  jti?: string;
}

/**
 * Token pair (access + refresh tokens)
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
