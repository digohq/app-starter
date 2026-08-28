import { format } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

/**
 * Default timezone used to interpret an event/session's times when the record
 * has no explicit `timezone` set. Event/session times are treated as wall-clock
 * values in this zone so they render identically regardless of the viewer's
 * system clock.
 */
export const DEFAULT_EVENT_TIMEZONE = 'America/Los_Angeles';

/** Resolve the timezone an event/session's times should be interpreted in. */
export function resolveEventTimezone(tz?: string | null): string {
  return tz || DEFAULT_EVENT_TIMEZONE;
}

/**
 * Format a stored timestamp as a "h:mm a" time-of-day string in the event's
 * timezone. Stable across viewers regardless of their system timezone.
 */
export function formatTimeInZone(
  iso: string | Date | null | undefined,
  tz?: string | null,
): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return formatInTimeZone(d, resolveEventTimezone(tz), 'h:mm a');
}

/**
 * Format a stored timestamp with an arbitrary date-fns format string, in the
 * event's timezone.
 */
export function formatInZone(
  iso: string | Date | null | undefined,
  tz: string | null | undefined,
  fmt: string,
): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return formatInTimeZone(d, resolveEventTimezone(tz), fmt);
}

/**
 * Read the calendar date of a stored timestamp *in the event's timezone* and
 * return it as a local Date at midnight — suitable for a date-picker field
 * (which renders in the browser's local time).
 */
export function zonedDateForPicker(
  iso: string | Date | null | undefined,
  tz?: string | null,
): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  const ymd = formatInTimeZone(d, resolveEventTimezone(tz), 'yyyy-MM-dd');
  const [y, m, day] = ymd.split('-').map((p) => parseInt(p, 10));
  return new Date(y, m - 1, day);
}

/**
 * Combine a date-picker Date (local midnight) and a "h:mm a" time string into a
 * UTC instant, interpreting the wall-clock value as being in the event's
 * timezone. Returns null when the time string is unparseable.
 */
export function combineDateTimeInZone(
  date: Date,
  timeString: string,
  tz?: string | null,
): Date | null {
  if (!date || !timeString) return null;
  const timeMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!timeMatch) return null;

  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const period = timeMatch[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  const wallClock = `${format(date, 'yyyy-MM-dd')} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  return fromZonedTime(wallClock, resolveEventTimezone(tz));
}

/** Build a UTC instant for the start (midnight) of a picker date in a zone. */
export function startOfDayInZone(date: Date, tz?: string | null): Date {
  const wallClock = `${format(date, 'yyyy-MM-dd')} 00:00:00`;
  return fromZonedTime(wallClock, resolveEventTimezone(tz));
}
