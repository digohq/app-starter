import type { Request } from 'express';

/**
 * Best-effort client IP for audit logging (X-Forwarded-For first hop, else req.ip).
 */
export function extractClientIp(req: Pick<Request, 'ip' | 'headers'>): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = typeof raw === 'string' ? raw.split(',')[0]?.trim() : null;
  if (first) return first;
  const ip = req.ip;
  if (ip && ip !== '::1' && ip !== '::ffff:127.0.0.1') return ip;
  if (ip) return ip;
  return null;
}
