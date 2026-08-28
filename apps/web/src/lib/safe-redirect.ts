/**
 * Guards the `next=` query param on `/invite/magic` (and any other redirect
 * hand-off) against open redirects.
 *
 * Only same-origin, relative paths are allowed: a single leading `/`, never a
 * protocol-relative `//host`, and never a backslash — some browsers normalise
 * `\` to `/`, which would turn `/\evil.com` into `//evil.com`.
 *
 * Control characters are rejected outright: the WHATWG URL parser strips
 * U+0009, U+000A and U+000D before parsing, so `/<tab>/evil.example.com` would
 * otherwise pass the `//` check here and still navigate off-origin.
 */
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function isSafeRelativePath(value: string | null | undefined): value is string {
  if (typeof value !== 'string') return false;
  if (value.length === 0) return false;
  if (CONTROL_CHARACTERS.test(value)) return false;
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//')) return false;
  if (value.includes('\\')) return false;

  return true;
}
