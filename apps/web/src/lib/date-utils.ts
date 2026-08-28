import { formatInTimeZone } from 'date-fns-tz';
import { resolveEventTimezone } from './datetime';

/**
 * Format an event/session date in a fixed timezone — the provided `timeZone`
 * when set, otherwise the default event timezone. Never falls back to the
 * viewer's local clock, so times render identically for every viewer.
 */
export function formatTz(
  date: Date | string | number,
  formatStr: string,
  timeZone?: string | null,
): string {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return formatInTimeZone(d, resolveEventTimezone(timeZone), formatStr);
  } catch (error) {
    return '';
  }
}
