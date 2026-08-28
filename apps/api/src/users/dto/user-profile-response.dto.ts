export class UserProfileResponseDto {
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
