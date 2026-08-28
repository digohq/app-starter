import { NextRequest, NextResponse } from 'next/server';
import { middleware } from './middleware';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn().mockImplementation((init) => ({ type: 'next', init })),
    rewrite: jest.fn().mockImplementation((url, init) => ({ type: 'rewrite', url, init })),
    redirect: jest.fn().mockImplementation((url, init) => ({ type: 'redirect', url, init })),
  },
}));

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
      nextUrl: { pathname: '/event-management/event-1/edit', search: '' },
      url: 'http://events.company.com/event-management/event-1/edit',
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
    expect(url.toString()).toBe('http://localhost:3000/event-management/event-1/edit');
    expect(init).toEqual({ status: 302 });
  });

  it('should rewrite to error page for unknown domain', async () => {
    const request = {
      headers: new Headers({ host: 'unknown.com' }),
      nextUrl: { pathname: '/' },
      url: 'http://unknown.com/',
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
