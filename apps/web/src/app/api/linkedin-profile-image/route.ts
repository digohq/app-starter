import { NextRequest, NextResponse } from 'next/server';
import { decodeHtmlEntities } from '@/lib/html-utils';

const ALLOWED_PREFIXES = [
  'https://www.linkedin.com/in/',
  'https://linkedin.com/in/',
  'http://www.linkedin.com/in/',
  'http://linkedin.com/in/',
];

const FETCH_OPTIONS = {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  },
};

function isAllowedLinkedInUrl(input: string): boolean {
  try {
    const url = new URL(input);
    const normalized = url.origin + url.pathname;
    return ALLOWED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
  } catch {
    return false;
  }
}

function extractOgImage(html: string): string | null {
  const ogImageMatch = html.match(
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
  );
  if (ogImageMatch?.[1]) return ogImageMatch[1];
  const contentFirstMatch = html.match(
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
  );
  return contentFirstMatch?.[1] ?? null;
}

function extractOgTitle(html: string): string | null {
  const ogTitleMatch = html.match(
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
  );
  if (ogTitleMatch?.[1]) return decodeHtmlEntities(ogTitleMatch[1]).trim();
  const contentFirstMatch = html.match(
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i,
  );
  return contentFirstMatch?.[1] ? decodeHtmlEntities(contentFirstMatch[1]).trim() : null;
}

/**
 * Parse LinkedIn og:title into name, role, company.
 * Common formats: "Name - Title at Company | LinkedIn", "Name | LinkedIn", "Name - Title | LinkedIn".
 */
function parseLinkedInTitle(title: string): { name: string; role: string; company: string } {
  let name = '';
  let role = '';
  let company = '';
  const withoutLinkedIn = title.replace(/\s*\|\s*LinkedIn\s*$/i, '').trim();
  const main = withoutLinkedIn.trim();
  if (!main) return { name, role, company };

  const dashIndex = main.indexOf(' - ');
  if (dashIndex > 0) {
    name = main.slice(0, dashIndex).trim();
    const rest = main.slice(dashIndex + 3).trim();
    const atIndex = rest.lastIndexOf(' at ');
    if (atIndex > 0) {
      role = rest.slice(0, atIndex).trim();
      company = rest.slice(atIndex + 4).trim();
    } else {
      role = rest;
    }
  } else {
    name = main;
  }
  return { name, role, company };
}

function parseImageContentType(contentType: string | null): string {
  if (!contentType) return 'image/jpeg';
  const lower = contentType.toLowerCase();
  if (lower.includes('image/png')) return 'image/png';
  if (lower.includes('image/webp')) return 'image/webp';
  return 'image/jpeg';
}

/**
 * POST /api/linkedin-profile-image
 * Body: { url: string, eventId?: string }
 * Headers: Authorization: Bearer <token>
 *
 * Fetches the LinkedIn profile page, extracts og:image, downloads the image
 * server-side (avoiding CDN hotlink 403), uploads it to our backend, and
 * returns our hosted image URL.
 */
export async function POST(request: NextRequest) {
  let body: { url?: string; eventId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', imageUrl: null }, { status: 400 });
  }

  const linkedInUrl = typeof body?.url === 'string' ? body.url.trim() : '';
  if (!linkedInUrl || !isAllowedLinkedInUrl(linkedInUrl)) {
    return NextResponse.json(
      {
        error: 'URL must be a LinkedIn profile (e.g. https://www.linkedin.com/in/username)',
        imageUrl: null,
      },
      { status: 400 },
    );
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authorization required', imageUrl: null }, { status: 401 });
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const uploadPath = body.eventId
    ? `/api/events/${body.eventId}/sessions/upload-speaker-image`
    : '/api/sessions/upload-speaker-image';
  const uploadUrl = `${apiBase}${uploadPath}`;

  try {
    const profileAbort = new AbortController();
    const profileTimeout = setTimeout(() => profileAbort.abort(), 8000);

    const profileRes = await fetch(linkedInUrl, {
      signal: profileAbort.signal,
      ...FETCH_OPTIONS,
      redirect: 'follow',
    });
    clearTimeout(profileTimeout);

    if (!profileRes.ok) {
      return NextResponse.json(
        { error: 'Could not fetch profile page', imageUrl: null },
        { status: 200 },
      );
    }

    const html = await profileRes.text();
    const rawImageUrl = extractOgImage(html);
    const imageUrl = rawImageUrl ? decodeHtmlEntities(rawImageUrl) : null;

    const ogTitle = extractOgTitle(html);
    const profileFields = ogTitle
      ? parseLinkedInTitle(ogTitle)
      : { name: '', role: '', company: '' };

    if (!imageUrl) {
      return NextResponse.json(
        {
          error: 'No profile image found',
          imageUrl: null,
          name: profileFields.name || undefined,
          role: profileFields.role || undefined,
          company: profileFields.company || undefined,
        },
        { status: 200 },
      );
    }

    const imageAbort = new AbortController();
    const imageTimeout = setTimeout(() => imageAbort.abort(), 10000);

    const imageRes = await fetch(imageUrl, {
      signal: imageAbort.signal,
      headers: {
        ...FETCH_OPTIONS.headers,
        Referer: 'https://www.linkedin.com/',
      },
      redirect: 'follow',
    });
    clearTimeout(imageTimeout);

    if (!imageRes.ok) {
      return NextResponse.json(
        {
          error:
            'Could not download image (CDN may block hotlinking). Try uploading a photo manually.',
          imageUrl: null,
          name: profileFields.name || undefined,
          role: profileFields.role || undefined,
          company: profileFields.company || undefined,
        },
        { status: 200 },
      );
    }

    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
    const contentType = parseImageContentType(imageRes.headers.get('Content-Type'));
    const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    const filename = `linkedin-profile.${ext}`;

    const formData = new FormData();
    formData.append('file', new Blob([imageBuffer], { type: contentType }), filename);

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
      },
      body: formData,
    });

    if (!uploadRes.ok) {
      return NextResponse.json(
        {
          error: 'Upload to storage failed',
          imageUrl: null,
        },
        { status: 200 },
      );
    }

    const uploadData = (await uploadRes.json()) as { url?: string };
    const hostedUrl = uploadData?.url || null;
    return NextResponse.json({
      imageUrl: hostedUrl,
      name: profileFields.name || undefined,
      role: profileFields.role || undefined,
      company: profileFields.company || undefined,
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out', imageUrl: null }, { status: 200 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch profile or upload image', imageUrl: null },
      { status: 200 },
    );
  }
}
