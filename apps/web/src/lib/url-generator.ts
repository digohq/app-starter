type DomainMappingLike = {
  domain: string;
  verificationStatus?: string;
};

type OrganizationLike = {
  id?: string;
  domainMappings?: DomainMappingLike[];
};

type EntityLike = {
  slug?: string;
  id?: string;
  organizationIds?: string[];
  organizationId?: string | null;
  organization?: OrganizationLike | null;
  organizations?: OrganizationLike[];
  event?: {
    slug?: string;
    organizationIds?: string[];
    organization?: OrganizationLike | null;
    organizations?: OrganizationLike[];
  } | null;
};

function getOriginForDomain(domain: string): string {
  if (domain.includes('localhost') || domain.includes('127.0.0.1')) {
    const isHttps = process.env.NEXT_PUBLIC_USE_HTTPS === 'true';
    return `${isHttps ? 'https' : 'http'}://${domain}`;
  }

  return `https://${domain}`;
}

function getEntityOrganizations(entity: EntityLike): OrganizationLike[] {
  const directOrganizations = entity.organizations ?? [];
  const directOrganization = entity.organization ? [entity.organization] : [];
  const eventOrganizations = entity.event?.organizations ?? [];
  const eventOrganization = entity.event?.organization ? [entity.event.organization] : [];

  return [
    ...directOrganizations,
    ...directOrganization,
    ...eventOrganizations,
    ...eventOrganization,
  ];
}

function getVerifiedCustomDomain(entity: EntityLike): string | null {
  for (const organization of getEntityOrganizations(entity)) {
    const verifiedMapping = organization.domainMappings?.find(
      (mapping) => mapping.verificationStatus === 'VERIFIED',
    );

    if (verifiedMapping?.domain) {
      return verifiedMapping.domain;
    }
  }

  return null;
}

function belongsToCurrentOrganization(
  entity: EntityLike,
  currentOrganizationId?: string | null,
): boolean {
  if (!currentOrganizationId) {
    return false;
  }

  if (entity.organizationIds?.includes(currentOrganizationId)) {
    return true;
  }

  if (entity.organizationId === currentOrganizationId) {
    return true;
  }

  if (entity.organization?.id === currentOrganizationId) {
    return true;
  }

  if (entity.organizations?.some((organization) => organization.id === currentOrganizationId)) {
    return true;
  }

  if (entity.event?.organizationIds?.includes(currentOrganizationId)) {
    return true;
  }

  if (entity.event?.organization?.id === currentOrganizationId) {
    return true;
  }

  return (
    entity.event?.organizations?.some(
      (organization) => organization.id === currentOrganizationId,
    ) ?? false
  );
}

export function getManagementUrl(path: string): string {
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${appBaseUrl}${normalizedPath}`;
}

export function getEntityUrl(
  entity: EntityLike,
  entityType: 'event' | 'session' | 'calendar',
  currentDomain?: string | null,
  currentOrganizationId?: string | null,
): string {
  const pathPrefix =
    entityType === 'event' ? '/events' : entityType === 'session' ? '/session' : '/calendar';

  let idOrSlug = entity.slug || entity.id;
  if (entityType === 'event' && !idOrSlug && entity.event?.slug) {
    idOrSlug = entity.event.slug;
  }

  const path = `${pathPrefix}/${idOrSlug}`;
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (currentDomain) {
    if (belongsToCurrentOrganization(entity, currentOrganizationId)) {
      const origin = getOriginForDomain(currentDomain);
      // getOriginForDomain already includes protocol
      return `${origin}${path}`;
    }

    return `${appBaseUrl}${path}`;
  }

  const entityCustomDomain = getVerifiedCustomDomain(entity);
  if (entityCustomDomain) {
    const origin = getOriginForDomain(entityCustomDomain);
    return `${origin}${path}`;
  }

  return `${appBaseUrl}${path}`;
}
