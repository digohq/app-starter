/**
 * Validation limits used for bio fields across API and web.
 * Update this constant to change the limit everywhere.
 */
export const FULL_BIO_MAX_LENGTH = 5000;

/**
 * Plain-text character limit for short bio fields (User.shortBio, SessionSpeaker.shortBio) —
 * the one- or two-sentence blurb shown in cards and chips.
 */
export const SHORT_BIO_TEXT_MAX = 500;

/**
 * Maximum number of additional tags (non-type tags) allowed on events and sessions.
 * Used by API DTOs, web schemas, UI components, and event import.
 */
export const MAX_ADDITIONAL_TAGS = 7;
