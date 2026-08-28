import { IsString, IsNotEmpty, IsLowercase, Matches } from 'class-validator';

export class CreateDomainMappingDto {
  @IsString()
  @IsNotEmpty()
  @IsLowercase()
  @Matches(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i, {
    message: 'Invalid domain format. Hostname only, no protocol or path.',
  })
  domain: string;
}
