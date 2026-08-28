import { apiClient } from './api-client';

export interface UserProfileResponse {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  timezone: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserProfileRequest {
  name?: string;
  username?: string;
  bio?: string;
  timezone?: string;
  /** When present the profile is submitted as multipart and the file replaces the avatar. */
  avatarFile?: File;
}

export interface PublicUserResponse {
  id: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
}

export interface UserSearchResult {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

export class UsersApi {
  async getUserProfile(): Promise<UserProfileResponse> {
    return apiClient.get<UserProfileResponse>('/api/users/me');
  }

  async updateUserProfile(data: UpdateUserProfileRequest): Promise<UserProfileResponse> {
    if (!data.avatarFile) {
      return apiClient.put<UserProfileResponse>('/api/users/me', data);
    }

    const formData = new FormData();
    formData.append('avatar', data.avatarFile);

    for (const [key, value] of Object.entries(data)) {
      if (key === 'avatarFile' || value === undefined || value === null) continue;
      formData.append(key, String(value));
    }

    return apiClient.put<UserProfileResponse>('/api/users/me', formData);
  }

  async searchUsers(query: string): Promise<UserSearchResult[]> {
    const params = new URLSearchParams({ q: query });
    return apiClient.get<UserSearchResult[]>(`/api/users/search?${params.toString()}`);
  }

  async getPublicUserProfile(username: string): Promise<PublicUserResponse> {
    return apiClient.get<PublicUserResponse>(`/api/users/username/${username}`);
  }
}

export const usersApi = new UsersApi();
