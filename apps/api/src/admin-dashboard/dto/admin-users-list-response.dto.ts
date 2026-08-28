export class AdminUserListItemDto {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  quarantinedAt: string | null;
  isGlobalAdmin: boolean;
}

export class AdminUsersListResponseDto {
  items: AdminUserListItemDto[];
  page: number;
  pageSize: number;
  total: number;
}
