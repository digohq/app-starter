import { AuthResponse, AuthUser } from '@app-starter/shared';
import { apiClient, ApiError } from './api-client';

export interface RequestOtpRequest {
  email: string;
}

export interface RequestOtpResponse {
  message: string;
}

export interface SignUpOtpRequest {
  email: string;
  otp: string;
  name?: string;
  intent?: string;
}

export interface LoginOtpRequest {
  email: string;
  otp: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  name?: string;
  redirectUrl?: string;
  intent?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken?: string;
}

export interface RequestPasswordResetRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  message: string;
}

export interface ResendVerificationResponse {
  message: string;
}

// Re-export AuthResponse from shared package
export type { AuthResponse };

export interface MagicLinkDetails {
  email: string;
  redirectUrl: string;
  inviterName?: string | null;
  targetName?: string | null;
  targetType?: 'event' | 'session' | 'organization' | 'general';
  role?: string | null;
  expiresAt?: string | null;
  status?: string | null;
  userName?: string | null;
  isNameRequired?: boolean;

  // speaker-invite prefill + validation
  requireSpeakerPhone?: boolean;
  phone?: string | null;
  requireSpeakerTerms?: boolean;
  speakerTerms?: { id: string; title: string; content: string; version: number } | null;
  alreadyAcceptedTerms?: boolean;
}

export class AuthApi {
  async requestOtp(data: RequestOtpRequest): Promise<RequestOtpResponse> {
    return apiClient.post<RequestOtpResponse>('/api/auth/otp/request', data);
  }

  async requestOtpForLogin(data: RequestOtpRequest): Promise<RequestOtpResponse> {
    return apiClient.post<RequestOtpResponse>('/api/auth/otp/request-login', data);
  }

  async signUpWithOtp(data: SignUpOtpRequest): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/auth/signup/otp', data);
  }

  async signUp(data: SignUpRequest): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/auth/signup', data);
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/auth/login', data);
  }

  async loginWithOtp(data: LoginOtpRequest): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/auth/login/otp', data);
  }

  async refreshToken(data: RefreshTokenRequest): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/auth/refresh', data);
  }

  async logout(): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/api/auth/logout', {});
  }

  async requestPasswordReset(data: RequestPasswordResetRequest): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/api/auth/password-reset/request', data);
  }

  async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/api/auth/password-reset/reset', data);
  }

  async verifyEmail(data: VerifyEmailRequest): Promise<VerifyEmailResponse> {
    return apiClient.post<VerifyEmailResponse>('/api/auth/verify-email', data);
  }

  async resendVerification(): Promise<ResendVerificationResponse> {
    return apiClient.post<ResendVerificationResponse>('/api/auth/resend-verification', {});
  }

  initiateGoogleAuth(state?: string) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    let url = `${apiUrl}/api/auth/google`;

    // Add current origin to state to ensure we redirect back to the correct domain
    // This is crucial for custom domain authentication
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const stateObj = {
      origin: currentOrigin,
      appState: state || '',
    };

    const encodedState = btoa(JSON.stringify(stateObj));
    url += `?state=${encodeURIComponent(encodedState)}`;

    window.location.href = url;
  }

  async getMe(): Promise<AuthUser> {
    return apiClient.get<AuthUser>('/api/auth/me');
  }

  async magicLogin(data: {
    token: string;
    type: string;
  }): Promise<AuthResponse & { redirectUrl: string }> {
    return apiClient.post<AuthResponse & { redirectUrl: string }>(
      '/api/auth/magic-link/accept',
      data,
    );
  }

  async getMagicLinkDetails(token: string, type: string): Promise<MagicLinkDetails> {
    return apiClient.get<MagicLinkDetails>(`/api/auth/magic-link/${token}/details?type=${type}`);
  }

  async acceptMagicLink(data: {
    token: string;
    type: string;
    name?: string;
    phone?: string;
    acceptedTermsRevisionId?: string;
  }): Promise<AuthResponse & { redirectUrl: string }> {
    return apiClient.post<AuthResponse & { redirectUrl: string }>(
      '/api/auth/magic-link/accept',
      data,
    );
  }

  async declineMagicLink(data: { token: string; type: string }): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/api/auth/magic-link/decline', data);
  }
}

export const authApi = new AuthApi();
// Re-export ApiError from shared package (already imported from api-client)
export type { ApiError };
