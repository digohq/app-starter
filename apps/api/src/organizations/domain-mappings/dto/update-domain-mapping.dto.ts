import { IsString, IsOptional, IsUrl, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDomainMappingDto {
  @ApiPropertyOptional({
    description: 'URL of the custom logo to display on pages served via this domain',
    example: 'https://example.com/logo.png',
  })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Invalid logo URL format' })
  customLogoUrl?: string | null;

  @ApiPropertyOptional({
    description: 'URL of the custom favicon to display on pages served via this domain',
    example: 'https://example.com/favicon.ico',
  })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Invalid favicon URL format' })
  customFaviconUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Height of the custom logo in pixels',
    example: 40,
  })
  @IsOptional()
  @IsNumber()
  @Min(16)
  logoHeight?: number | null;
}
