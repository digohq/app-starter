import { IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { CreateVideoRequest } from '@app-starter/shared';

export class CreateVideoDto implements CreateVideoRequest {
  @IsString()
  @MinLength(1, { message: 'Name must be at least 1 character' })
  @MaxLength(255, { message: 'Name must be less than 255 characters' })
  name: string;

  /** Restricted to http(s) because the URL is handed to an external workflow. */
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'URL must be a valid http or https address' },
  )
  @MaxLength(2048)
  url: string;
}
