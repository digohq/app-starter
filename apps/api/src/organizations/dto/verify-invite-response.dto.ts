import { OrgRole } from '@app-starter/shared';

export interface VerifyInviteResponseDto {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  role: OrgRole;
  authToken: string;
  message: string;
  isNewUser: boolean;
}
