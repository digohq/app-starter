import { generateMetadata } from '../layout';
import { domainMappingsApi } from '@/lib/domain-mappings-api';
import { headers } from 'next/headers';

// Mock next/headers
jest.mock('next/headers', () => ({
  headers: jest.fn(),
}));

// Mock domain-mappings-api
jest.mock('@/lib/domain-mappings-api', () => ({
  domainMappingsApi: {
    resolve: jest.fn(),
  },
}));

describe('RootLayout generateMetadata', () => {
  const defaultMetadata = {
    title: 'App Starter',
    description:
      'A multi-tenant SaaS starter with authentication, organizations, and invites already wired up.',
    icons: {
      icon: '/images/favicon.png',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return default metadata for localhost', async () => {
    (headers as jest.Mock).mockResolvedValue(new Map([['host', 'localhost:3000']]));

    const metadata = await generateMetadata();

    expect(metadata).toEqual(defaultMetadata);
    expect(domainMappingsApi.resolve).not.toHaveBeenCalled();
  });

  it('should return default metadata for example.com', async () => {
    (headers as jest.Mock).mockResolvedValue(new Map([['host', 'localhost:3000']]));

    const metadata = await generateMetadata();

    expect(metadata).toEqual(defaultMetadata);
    expect(domainMappingsApi.resolve).not.toHaveBeenCalled();
  });

  it('should return custom favicon when on custom domain', async () => {
    const customFaviconUrl = 'https://custom.com/favicon.ico';
    (headers as jest.Mock).mockResolvedValue(new Map([['host', 'events.custom.com']]));
    (domainMappingsApi.resolve as jest.Mock).mockResolvedValue({
      customFaviconUrl,
    });

    const metadata = await generateMetadata();

    expect(metadata.icons).toEqual({
      icon: customFaviconUrl,
      shortcut: customFaviconUrl,
      apple: customFaviconUrl,
    });
    expect(domainMappingsApi.resolve).toHaveBeenCalledWith('events.custom.com');
  });

  it('should return default metadata when custom domain resolution fails', async () => {
    (headers as jest.Mock).mockResolvedValue(new Map([['host', 'events.custom.com']]));
    (domainMappingsApi.resolve as jest.Mock).mockRejectedValue(new Error('Failed'));

    const metadata = await generateMetadata();

    expect(metadata).toEqual(defaultMetadata);
  });

  it('should return default metadata when custom domain has no custom favicon', async () => {
    (headers as jest.Mock).mockResolvedValue(new Map([['host', 'events.custom.com']]));
    (domainMappingsApi.resolve as jest.Mock).mockResolvedValue({
      customFaviconUrl: null,
    });

    const metadata = await generateMetadata();

    expect(metadata).toEqual(defaultMetadata);
  });
});
