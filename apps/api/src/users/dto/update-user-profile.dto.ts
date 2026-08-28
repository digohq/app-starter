import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { FULL_BIO_MAX_LENGTH, RICH_TEXT_HTML_MAX } from '@app-starter/shared';
import { IsRichTextWithinLength } from '../../common/validators/rich-text-length.validator';

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MinLength(1, { message: 'Name must be at least 1 character' })
  @MaxLength(255, { message: 'Name must be less than 255 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(100, { message: 'Username must be less than 100 characters' })
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(RICH_TEXT_HTML_MAX)
  @IsRichTextWithinLength(FULL_BIO_MAX_LENGTH)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;
}
