import { getEntityUrl } from '../url-generator';

describe('getEntityUrl', () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  it('returns the entity custom domain on example.com when one is available', () => {
    const actual = getEntityUrl(
      {
        slug: 'launch-event',
        organizations: [
          {
            id: 'organization-1',
            domainMappings: [{ domain: 'events.company.com', verificationStatus: 'VERIFIED' }],
          },
        ],
      },
      'event',
    );

    expect(actual).toBe('https://events.company.com/events/launch-event');
  });

  it('keeps matching organization content on the current custom domain', () => {
    const actual = getEntityUrl(
      {
        slug: 'opening-keynote',
        organizationIds: ['organization-1'],
      },
      'session',
      'events.company.com',
      'organization-1',
    );

    expect(actual).toBe('https://events.company.com/session/opening-keynote');
  });

  it('falls back to example.com for non-organization content while on a custom domain', () => {
    const actual = getEntityUrl(
      {
        slug: 'outside-event',
        organizations: [
          {
            id: 'organization-2',
            domainMappings: [{ domain: 'other.company.com', verificationStatus: 'VERIFIED' }],
          },
        ],
      },
      'event',
      'events.company.com',
      'organization-1',
    );

    expect(actual).toBe('http://localhost:3000/events/outside-event');
  });

  it('uses the verified custom domain for calendars', () => {
    const actual = getEntityUrl(
      {
        slug: 'spring-calendar',
        organization: {
          id: 'organization-1',
          domainMappings: [{ domain: 'calendar.company.com', verificationStatus: 'VERIFIED' }],
        },
      },
      'calendar',
    );

    expect(actual).toBe('https://calendar.company.com/calendar/spring-calendar');
  });
});
