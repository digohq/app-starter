import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrgRole } from '@app-starter/shared';

export class UpdateUserRoleDto {
  @IsNotEmpty()
  @IsEnum(OrgRole)
  role: OrgRole;
}
