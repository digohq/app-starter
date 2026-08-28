import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminQuarantineUserDto {
  @ApiProperty({ description: 'Whether the user should be quarantined' })
  @IsBoolean()
  isQuarantined: boolean;

  @ApiProperty({ description: 'Reason for quarantine action', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
