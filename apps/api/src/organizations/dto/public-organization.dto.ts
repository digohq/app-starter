export class PublicDomainMappingDto {
  domain: string;
  verificationStatus: string;
}

export class PublicOrganizationDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  website: string | null;
  location: string | null;
  logoUrl: string | null;
  domainMappings: PublicDomainMappingDto[];
}
