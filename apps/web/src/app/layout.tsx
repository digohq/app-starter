import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/ThemeProvider';
import { CookieSync } from '@/components/auth/CookieSync';
import { AutoLogoutDialog } from '@/components/auth/AutoLogoutDialog';
import { QueryProvider } from '@/components/QueryProvider';
import { CustomDomainHeaderWrapper } from '@/components/layout/CustomDomainHeaderWrapper';
import { AppSideNav } from '@/components/layout/AppSideNav';
import { ScrollToTopOnNavigate } from '@/components/layout/ScrollToTopOnNavigate';
import { domainMappingsApi } from '@/lib/domain-mappings-api';
import { CustomDomainProvider } from '@/components/providers/CustomDomainProvider';
import { CookieConsentBanner } from '@/components/consent/CookieConsentBanner';
import { ACCESS_TOKEN_KEY } from '@/lib/auth-storage';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';

  const defaultMetadata: Metadata = {
    title: 'App Starter',
    description:
      'A multi-tenant SaaS starter with authentication, organizations, and invites already wired up.',
    icons: {
      icon: '/images/favicon.png',
    },
  };

  // Only attempt resolution if not on the main App Starter domain or localhost
  const isMainDomain = host.includes('example.com') || host.includes('localhost');
  if (!isMainDomain && host) {
    try {
      const resolution = await domainMappingsApi.resolve(host);
      if (resolution.customFaviconUrl) {
        return {
          ...defaultMetadata,
          icons: {
            icon: resolution.customFaviconUrl,
            shortcut: resolution.customFaviconUrl,
            apple: resolution.customFaviconUrl,
          },
        };
      }
    } catch (error) {
      // Silently fail and use default metadata
    }
  }

  return defaultMetadata;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const isWhiteLabelCalendar = headersList.get('x-app-starter-white-label-calendar') === '1';

  const customDomain = headersList.get('x-custom-domain');
  const customDomainOrganizationId = headersList.get('x-custom-domain-organization-id');

  // Every destination in the sidebar is authenticated-only, so it stays off
  // for signed-out visitors. Reading the cookie here rather than checking auth
  // on the client keeps the nav and the content margin in agreement, with no
  // sidebar flashing in before it is removed again.
  const cookieStore = await cookies();
  const isSignedIn = !!cookieStore.get(ACCESS_TOKEN_KEY);
  const hideSidebar = isWhiteLabelCalendar || !!customDomain || !isSignedIn;

  let customLogoUrl: string | null = null;
  let logoHeight: number | null = null;

  // Only attempt resolution if not on the main App Starter domain or localhost
  const isMainDomain = host.includes('example.com') || host.includes('localhost');
  if (!isMainDomain && host) {
    try {
      const resolution = await domainMappingsApi.resolve(host);
      customLogoUrl = resolution.customLogoUrl;
      logoHeight = resolution.logoHeight;
    } catch (error) {
      // Silently fail domain resolution for the header logo
      console.error(`Failed to resolve domain ${host}:`, error);
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <QueryProvider>
          <CookieSync />
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <CustomDomainProvider domain={customDomain} organizationId={customDomainOrganizationId}>
              <TooltipProvider>
                <div className="min-h-screen flex flex-col">
                  <CustomDomainHeaderWrapper
                    isWhiteLabelCalendar={isWhiteLabelCalendar}
                    customLogoUrl={customLogoUrl}
                    logoHeight={logoHeight}
                  />
                  <div className="flex flex-1 min-w-0">
                    {!hideSidebar && <AppSideNav />}
                    <main className={hideSidebar ? 'flex-1 min-w-0' : 'flex-1 min-w-0 md:ml-16'}>
                      {children}
                    </main>
                  </div>
                </div>
              </TooltipProvider>
              <Toaster />
              <AutoLogoutDialog />
              <ScrollToTopOnNavigate />
              <CookieConsentBanner />
              {/* White-label and custom-domain pages are branded public surfaces, not the
                    speaker's workspace — the reminder stays off them. */}
            </CustomDomainProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
