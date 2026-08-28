import { AuthResponse } from '@app-starter/shared';

/**
 * Auth response DTO implementing shared AuthResponse interface
 * This ensures API responses match the shared contract
 */
export class AuthResponseDto implements AuthResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    googleId?: string | null;
    avatarUrl?: string | null;
    slug?: string | null;
    defaultCalendarId?: string;
    defaultCalendarSlug?: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}
