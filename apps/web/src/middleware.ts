import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_TOKEN_KEY } from '@/lib/auth-storage';

/**
 * Sections of the app that only exist for a signed-in user. A logged-out
 * visitor is sent to the login page instead of being shown the shell of a
 * screen whose data will never load.
 *
 * Only prefixes that are authenticated end to end belong here. `/organization`
 * (singular) is the public per-tenant page and stays open, as do `/invites`,
 * which someone has to be able to open before they have an account.
 *
 * This is a navigation gate, not the security boundary: the cookie is readable
 * by client script, so presence proves intent rather than identity. Every
 * response still comes from the API, which validates the JWT on each request.
 */
const PROTECTED_PATH_PREFIXES = ['/dashboard', '/organizations', '/profile', '/settings'] as const;

const isProtectedPath = (pathname: string): boolean =>
  PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

// Helper to check if path is a candidate for short link (single segment, not system)
function isShortLinkCandidate(pathname: string): boolean {
  // Must be a single segment like /xyz, not /xyz/abc
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length !== 1) return false;

  const slug = segments[0];

  // Skip system paths and known app routes
  const systemPaths = [
    '_next',
    'api',
    'static',
    'favicon.ico',
    'robots.txt',
    'sitemap.xml',
    'admin',
    'auth',
    'cookies',
    'dashboard',
    'domain-error',
    'fonts',
    'get-started',
    'images',
    'impersonate',
    'invite',
    'invites',
    'login',
    'organization',
    'organizations',
    'privacy',
    'profile',
    'register',
    'reset-password',
    'settings',
    'users',
    'verify-email',
    'verify-email-pending',
  ];

  if (systemPaths.includes(slug) || slug.startsWith('_')) {
    return false;
  }

  return true;
}

// Resolve slug via API
async function resolveShortLink(slug: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;

  try {
    const response = await fetch(`${apiUrl}/api/short-links/${slug}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 }, // Cache for 60s
    });

    if (response.ok) {
      const data = await response.json();
      return data.targetUrl;
    }
    return null;
  } catch (error) {
    console.error('Short link resolution failed', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  // 1. Authenticated-only sections, gated before anything renders so a
  // logged-out visitor never sees a protected screen. The intended
  // destination rides along so the login form can send them back to it.
  if (isProtectedPath(pathname) && !request.cookies.get(ACCESS_TOKEN_KEY)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl, { status: 302 });
  }

  // 2. Skip middleware for standard App Starter domains and local development
  // (We keep existing domain logic for custom domains, but add short link check first)

  // 3. Short Link Check (High Priority)
  if (isShortLinkCandidate(pathname)) {
    const slug = pathname.substring(1); // remove leading /
    const targetUrl = await resolveShortLink(slug);

    if (targetUrl) {
      // If targetUrl is relative (e.g. /events/xyz), prepend origin if needed or just redirect
      // NextResponse.redirect works with absolute URLs.
      // If target is relative, resolve against request.url
      return NextResponse.redirect(new URL(targetUrl, request.url), { status: 302 });
    }
    // If not found, fall through to normal app routing (will likely 404 there)
  }

  if (isStandardAppDomain(hostname)) {
    return NextResponse.next();
  }

  // ... rest of existing middleware ...
  // 4. Skip middleware for static assets, API routes, and standard system paths
  if (shouldSkipMiddleware(pathname)) {
    return NextResponse.next();
  }

  // 5. Resolve custom domain to organization slug
  try {
    const resolution = await resolveDomain(hostname);

    if (!resolution) {
      // Domain not found or not verified
      return NextResponse.rewrite(
        new URL(`/domain-error?domain=${hostname}&reason=not_found`, request.url),
      );
    }

    // 6. Serve the organization's public page at the custom domain root.
    if (pathname === '/') {
      const publicUrl = new URL(
        `/organization/${resolution.organizationSlug}${request.nextUrl.search}`,
        request.url,
      );
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-custom-domain', hostname);
      requestHeaders.set('x-custom-domain-organization-id', resolution.organizationId);
      return NextResponse.rewrite(publicUrl, { request: { headers: requestHeaders } });
    }

    // 7. Everything else on a custom domain belongs on the main app. Add an
    // organization-scoped path here when a vertical needs its own branded URL,
    // confirming the record belongs to this organization first.
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return NextResponse.redirect(new URL(pathname + request.nextUrl.search, frontendUrl), {
      status: 302,
    });
  } catch (error) {
    console.error('Domain resolution error:', error);
    // Graceful fallback: continue as if it's not a custom domain or show error page
    return NextResponse.next();
  }
}

function isStandardAppDomain(hostname: string): boolean {
  const allowedHosts = new Set<string>();
  const wildcardHosts: string[] = [];

  // Always allow localhost and Vercel/Railway previews
  allowedHosts.add('localhost:3000');
  allowedHosts.add('localhost:3000');
  allowedHosts.add('127.0.0.1:3000');

  // Helper to add host from URL string
  const addHostFromUrl = (urlStr: string | undefined) => {
    if (!urlStr) return;
    try {
      // Handle comma-separated lists
      const urls = urlStr.split(',').map((s) => s.trim());

      for (const u of urls) {
        if (u.includes('*')) {
          // Extract the domain part after *. e.g. https://*.example.com -> example.com
          // We'll support *.domain.com format
          try {
            // If it's a full URL with protocol
            let host = u;
            if (u.startsWith('http')) {
              const urlObj = new URL(u.replace('*.', 'star.')); // Temp replacement to satisfy URL parser
              host = urlObj.host.replace('star.', '*.');
            }

            if (host.startsWith('*.')) {
              wildcardHosts.push(host.substring(2)); // Remove *.
            } else {
              allowedHosts.add(host);
            }
          } catch (e) {
            // simple fallback if URL parsing fails on wildcards
            const parts = u.split('://');
            const domain = parts.length > 1 ? parts[1] : parts[0];
            if (domain.startsWith('*.')) {
              wildcardHosts.push(domain.substring(2));
            }
          }
        } else {
          const url = new URL(u);
          allowedHosts.add(url.host);
        }
      }
    } catch (e) {
      // ignore invalid urls
      console.warn('Failed to parse URL in middleware config', e);
    }
  };

  // Add from env vars
  addHostFromUrl(process.env.FRONTEND_URL);
  addHostFromUrl(process.env.NEXT_PUBLIC_APP_URL);
  addHostFromUrl(process.env.CORS_ALLOWED_ORIGINS);

  // Check direct matches
  if (allowedHosts.has(hostname)) return true;

  // Check wildcards
  for (const domain of wildcardHosts) {
    if (hostname.endsWith('.' + domain) || hostname === domain) {
      return true;
    }
  }

  // Check platform suffixes
  return hostname.endsWith('.vercel.app') || hostname.endsWith('.railway.app');
}

function shouldSkipMiddleware(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/domain-error') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/images') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  );
}

async function resolveDomain(hostname: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  try {
    const response = await fetch(`${apiUrl}/api/domain-mappings/resolve?domain=${hostname}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      // Cache resolution for 5 minutes
      next: { revalidate: 300 } as any,
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    return null;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
