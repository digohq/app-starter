import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UrlGeneratorService {
  constructor(private configService: ConfigService) {}

  private getBaseUrl(): string {
    return this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  private hasMatchingDomain(entityOrganizations: any[], currentDomain?: string): boolean {
    if (!currentDomain || !entityOrganizations || !Array.isArray(entityOrganizations)) return false;

    return entityOrganizations.some((organization) =>
      organization.domainMappings?.some(
        (mapping: any) =>
          mapping.domain === currentDomain && mapping.verificationStatus === 'VERIFIED',
      ),
    );
  }

  getEventUrl(event: any, currentDomain?: string): string {
    const slug = event.slug;
    const path = `/events/${slug}`;

    // Support relation shapes from Prisma (organizations array with nested domainMappings)
    if (currentDomain && this.hasMatchingDomain(event.organizations, currentDomain)) {
      return `https://${currentDomain}${path}`;
    }

    return `${this.getBaseUrl()}${path}`;
  }

  getSessionUrl(session: any, currentDomain?: string): string {
    const slug = session.slug;
    const path = `/session/${slug}`;

    // Support both standalone sessions (organizations relation) and event sessions (event.organizations relation)
    const organizations = session.organizations || session.event?.organizations;

    if (currentDomain && this.hasMatchingDomain(organizations, currentDomain)) {
      return `https://${currentDomain}${path}`;
    }

    return `${this.getBaseUrl()}${path}`;
  }

  getCalendarUrl(calendar: any, currentDomain?: string): string {
    // calendar might have a slug or not
    const idOrSlug = calendar.slug || calendar.id;
    // Actually the path could be /calendar/:id or /calendar/:slug? But the specs say Calendar has slug
    const path = `/calendar/${idOrSlug}`;

    // Calendar belongs to a single organization
    const organizations = calendar.organization ? [calendar.organization] : [];

    if (currentDomain && this.hasMatchingDomain(organizations, currentDomain)) {
      return `https://${currentDomain}${path}`;
    }

    return `${this.getBaseUrl()}${path}`;
  }
}
