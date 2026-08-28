import { IsString, IsOptional, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @IsString({ message: 'Organization name is required' })
  @MinLength(1, { message: 'Organization name must be at least 1 character' })
  @MaxLength(255, { message: 'Organization name must be less than 255 characters' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(2000, {
    message: 'Description must be less than 2000 characters',
  })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Location must be a string' })
  @MaxLength(255, { message: 'Location must be less than 255 characters' })
  location?: string;

  @IsOptional()
  @IsString({ message: 'Website must be a string' })
  @IsUrl({}, { message: 'Website must be a valid URL' })
  @MaxLength(500, { message: 'Website must be less than 500 characters' })
  website?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  logoUrl?: string;
}
