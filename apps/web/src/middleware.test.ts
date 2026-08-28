import { NextRequest, NextResponse } from 'next/server';
import { middleware } from './middleware';
import { ACCESS_TOKEN_KEY } from '@/lib/auth-storage';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn().mockImplementation((init) => ({ type: 'next', init })),
    rewrite: jest.fn().mockImplementation((url, init) => ({ type: 'rewrite', url, init })),
    redirect: jest.fn().mockImplementation((url, init) => ({ type: 'redirect', url, init })),
  },
}));

/** Stands in for NextRequest.cookies; pass a token to act as a signed-in visitor. */
const mockCookies = (accessToken?: string) => ({
  get: (name: string) =>
    name === ACCESS_TOKEN_KEY && accessToken ? { name, value: accessToken } : undefined,
});

describe('Middleware', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  it('should skip middleware for standard App Starter domains', async () => {
    const request = {
      headers: new Headers({ host: 'localhost:3000' }),
      nextUrl: { pathname: '/dashboard' },
      url: 'http://localhost:3000/dashboard',
      cookies: mockCookies('access-token'),
    } as unknown as NextRequest;

    const response = await middleware(request);

    expect(response).toEqual({ type: 'next' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should skip middleware for static assets', async () => {
    const request = {
      headers: new Headers({ host: 'custom.domain.com' }),
      nextUrl: { pathname: '/_next/static/style.css' },
      url: 'http://custom.domain.com/_next/static/style.css',
      cookies: mockCookies(),
    } as unknown as NextRequest;

    const response = await middleware(request);

    expect(response).toEqual({ type: 'next' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should rewrite to the organization page for a valid custom domain', async () => {
    const request = {
      headers: new Headers({ host: 'events.company.com' }),
      nextUrl: { pathname: '/', search: '' },
      url: 'http://events.company.com/',
      cookies: mockCookies(),
    } as unknown as NextRequest;

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          organizationSlug: 'company-organization',
          organizationId: 'organization-1',
        }),
    });

    const response = await middleware(request);

    expect(response).toEqual(expect.objectContaining({ type: 'rewrite' }));
    const [url] = (NextResponse.rewrite as jest.Mock).mock.calls[0];
    expect(url.pathname).toBe('/organization/company-organization');
  });

  it('should redirect non-organization content on a custom domain back to example.com', async () => {
    process.env.FRONTEND_URL = 'http://localhost:3000';

    const request = {
      headers: new Headers({ host: 'events.company.com' }),
      nextUrl: { pathname: '/events/other-organization-event', search: '?ref=abc' },
      url: 'http://events.company.com/events/other-organization-event?ref=abc',
      cookies: mockCookies(),
    } as unknown as NextRequest;

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            organizationSlug: 'company-organization',
            organizationId: 'organization-1',
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: false }),
      });

    const response = await middleware(request);

    expect(response).toEqual(expect.objectContaining({ type: 'redirect' }));
    const [url, init] = (NextResponse.redirect as jest.Mock).mock.calls[0];
    expect(url.toString()).toBe('http://localhost:3000/events/other-organization-event?ref=abc');
    expect(init).toEqual({ status: 302 });
  });

  it('should redirect user profiles from custom domains back to example.com', async () => {
    process.env.FRONTEND_URL = 'http://localhost:3000';

    const request = {
      headers: new Headers({ host: 'events.company.com' }),
      nextUrl: { pathname: '/users/jane-speaker', search: '' },
      url: 'http://events.company.com/users/jane-speaker',
      cookies: mockCookies(),
    } as unknown as NextRequest;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          organizationSlug: 'company-organization',
          organizationId: 'organization-1',
        }),
    });

    const response = await middleware(request);

    expect(response).toEqual(expect.objectContaining({ type: 'redirect' }));
    const [url, init] = (NextResponse.redirect as jest.Mock).mock.calls[0];
    expect(url.toString()).toBe('http://localhost:3000/users/jane-speaker');
    expect(init).toEqual({ status: 302 });
  });

  it('should redirect edit pages from custom domains back to example.com', async () => {
    process.env.FRONTEND_URL = 'http://localhost:3000';

    const request = {
      headers: new Headers({ host: 'events.company.com' }),
      nextUrl: { pathname: '/projects/project-1/edit', search: '' },
      url: 'http://events.company.com/projects/project-1/edit',
      cookies: mockCookies(),
    } as unknown as NextRequest;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          organizationSlug: 'company-organization',
          organizationId: 'organization-1',
        }),
    });

    const response = await middleware(request);

    expect(response).toEqual(expect.objectContaining({ type: 'redirect' }));
    const [url, init] = (NextResponse.redirect as jest.Mock).mock.calls[0];
    expect(url.toString()).toBe('http://localhost:3000/projects/project-1/edit');
    expect(init).toEqual({ status: 302 });
  });

  it('redirects a signed-out visitor from a protected path to the login page', async () => {
    const request = {
      headers: new Headers({ host: 'localhost:3000' }),
      nextUrl: { pathname: '/organizations', search: '' },
      url: 'http://localhost:3000/organizations',
      cookies: mockCookies(),
    } as unknown as NextRequest;

    const response = await middleware(request);

    expect(response).toEqual(expect.objectContaining({ type: 'redirect' }));
    const [url, init] = (NextResponse.redirect as jest.Mock).mock.calls[0];
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('redirect')).toBe('/organizations');
    expect(init).toEqual({ status: 302 });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('preserves the query string of the protected path it redirected away from', async () => {
    const request = {
      headers: new Headers({ host: 'localhost:3000' }),
      nextUrl: { pathname: '/settings/notifications', search: '?tab=email' },
      url: 'http://localhost:3000/settings/notifications?tab=email',
      cookies: mockCookies(),
    } as unknown as NextRequest;

    await middleware(request);

    const [url] = (NextResponse.redirect as jest.Mock).mock.calls[0];
    expect(url.searchParams.get('redirect')).toBe('/settings/notifications?tab=email');
  });

  it('lets a signed-in visitor through to a protected path', async () => {
    const request = {
      headers: new Headers({ host: 'localhost:3000' }),
      nextUrl: { pathname: '/organizations', search: '' },
      url: 'http://localhost:3000/organizations',
      cookies: mockCookies('access-token'),
    } as unknown as NextRequest;

    const response = await middleware(request);

    expect(response).toEqual({ type: 'next' });
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it('leaves the public organization page open to signed-out visitors', async () => {
    const request = {
      headers: new Headers({ host: 'localhost:3000' }),
      nextUrl: { pathname: '/organization/company-organization', search: '' },
      url: 'http://localhost:3000/organization/company-organization',
      cookies: mockCookies(),
    } as unknown as NextRequest;

    const response = await middleware(request);

    expect(response).toEqual({ type: 'next' });
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it('should rewrite to error page for unknown domain', async () => {
    const request = {
      headers: new Headers({ host: 'unknown.com' }),
      nextUrl: { pathname: '/' },
      url: 'http://unknown.com/',
      cookies: mockCookies(),
    } as unknown as NextRequest;

    mockFetch.mockResolvedValue({
      ok: false,
    });

    const response = await middleware(request);

    expect(response).toEqual(expect.objectContaining({ type: 'rewrite' }));
    const [url] =
      (NextResponse.rewrite as jest.Mock).mock.calls[1] ||
      (NextResponse.rewrite as jest.Mock).mock.calls[0];
    expect(url.pathname).toBe('/domain-error');
    expect(url.search).toBe('?domain=unknown.com&reason=not_found');
  });
});
