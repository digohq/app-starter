export class CreateShortLinkDto {
  slug: string;
  targetUrl: string;
  entityId?: string;
  entityType?: string;
  description?: string;
}
