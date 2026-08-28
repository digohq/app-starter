import { render, screen } from '@testing-library/react';
import RootLayout from '../layout';
import { cookies, headers } from 'next/headers';
import { domainMappingsApi } from '@/lib/domain-mappings-api';
import { ACCESS_TOKEN_KEY } from '@/lib/auth-storage';

jest.mock('next/headers', () => ({
  headers: jest.fn(),
  cookies: jest.fn(),
}));

jest.mock('@/lib/domain-mappings-api', () => ({
  domainMappingsApi: {
    resolve: jest.fn(),
  },
}));

// A real client, not a pass-through: the layout mounts query-driven children such as the
// speaker tasks indicator.
jest.mock('@/components/QueryProvider', () => {
  const { QueryClient: TestQueryClient, QueryClientProvider: TestQueryClientProvider } =
    jest.requireActual('@tanstack/react-query');

  return {
    QueryProvider: ({ children }: { children: React.ReactNode }) => (
      <TestQueryClientProvider
        client={new TestQueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        {children}
      </TestQueryClientProvider>
    ),
  };
});

jest.mock('@/components/ThemeProvider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/auth/CookieSync', () => ({
  CookieSync: () => null,
}));

jest.mock('@/components/auth/AutoLogoutDialog', () => ({
  AutoLogoutDialog: () => null,
}));

jest.mock('@/components/layout/CustomDomainHeaderWrapper', () => ({
  CustomDomainHeaderWrapper: () => <div data-testid="unified-header" />,
}));

jest.mock('@/components/layout/AppSideNav', () => ({
  AppSideNav: () => <div data-testid="app-side-nav" />,
}));

jest.mock('@/components/layout/ScrollToTopOnNavigate', () => ({
  ScrollToTopOnNavigate: () => null,
}));

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/sonner', () => ({
  Toaster: () => null,
}));

/** Stands in for the cookie store; pass a token to act as a signed-in visitor. */
const mockCookieStore = (accessToken?: string) => ({
  get: (name: string) =>
    name === ACCESS_TOKEN_KEY && accessToken ? { name, value: accessToken } : undefined,
});

describe('RootLayout sidebar visibility', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (domainMappingsApi.resolve as jest.Mock).mockResolvedValue({ customLogoUrl: null });
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore('access-token'));
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('hides the sidebar on custom-domain event and session pages', async () => {
    (headers as jest.Mock).mockResolvedValue(
      new Map([
        ['host', 'events.company.com'],
        ['x-custom-domain', 'events.company.com'],
        ['x-custom-domain-organization-id', 'organization-1'],
      ]),
    );

    const layout = await RootLayout({ children: <div>content</div> });
    render(layout);

    expect(screen.queryByTestId('app-side-nav')).not.toBeInTheDocument();
  });

  it('shows the sidebar on the main example.com app', async () => {
    (headers as jest.Mock).mockResolvedValue(new Map([['host', 'localhost:3000']]));

    const layout = await RootLayout({ children: <div>content</div> });
    render(layout);

    expect(screen.getByTestId('app-side-nav')).toBeInTheDocument();
  });

  it('hides the sidebar from a signed-out visitor', async () => {
    (headers as jest.Mock).mockResolvedValue(new Map([['host', 'localhost:3000']]));
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore());

    const layout = await RootLayout({ children: <div>content</div> });
    render(layout);

    expect(screen.queryByTestId('app-side-nav')).not.toBeInTheDocument();
  });
});
