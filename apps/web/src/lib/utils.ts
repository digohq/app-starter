import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function decodeHtml(html: string): string {
  if (!html) return '';
  const map: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&#39;': "'",
    '&apos;': "'",
  };
  return html.replace(/&amp;|&lt;|&gt;|&quot;|&#039;|&#39;|&apos;/g, (m) => map[m]);
}

export function navigateToApp(path: string, router: any) {
  const isAbsolutePath = /^https?:\/\//.test(path);

  if (isAbsolutePath) {
    try {
      const targetUrl = new URL(path);
      const currentUrl = new URL(window.location.href);

      if (targetUrl.origin === currentUrl.origin) {
        router.push(`${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`);
        return;
      }

      window.location.href = targetUrl.toString();
      return;
    } catch (e) {
      console.error('Navigation error:', e);
    }
  }

  // Ensure path starts with /
  const targetPath = path.startsWith('/') ? path : `/${path}`;

  const appUrlStr = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrlStr) {
    router.push(targetPath);
    return;
  }

  try {
    const currentHost = window.location.host;
    const appUrl = new URL(appUrlStr);

    // Check if we need to redirect to main app domain
    if (currentHost !== appUrl.host) {
      const targetUrl = new URL(targetPath, appUrlStr);
      window.location.href = targetUrl.toString();
      return;
    }
  } catch (e) {
    console.error('Navigation error:', e);
  }

  router.push(targetPath);
}

export function getAppUrl(path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  const appUrlStr = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrlStr) return path;

  const targetPath = path.startsWith('/') ? path : `/${path}`;
  try {
    return new URL(targetPath, appUrlStr).toString();
  } catch (e) {
    return path;
  }
}

/**
 * Parses a time string (e.g., "10:30 AM", "14:00") and applies it to an existing date.
 * If no date is provided, it uses the current date.
 * Returns an ISO string.
 */
export function parseTime(timeString: string, existingDate?: string | Date | null): string | null {
  if (!timeString) return null;

  const cleaned = timeString.trim();
  const timeMatch = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!timeMatch) return null;

  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const ampm = timeMatch[3]?.toUpperCase();

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;

  const d = existingDate ? new Date(existingDate) : new Date();
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    fallback.setHours(hours, minutes, 0, 0);
    return fallback.toISOString();
  }

  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}
