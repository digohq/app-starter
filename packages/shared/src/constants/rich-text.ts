/**
 * Rich text storage contract shared by the API sanitizer, the web editor, and the
 * web display component. Changing an allowlist here changes it everywhere.
 */

/** Tags allowed in the "full" editor variant (long-form overview fields). */
export const RICH_TEXT_FULL_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'ul',
  'ol',
  'li',
  'blockquote',
  'h2',
  'h3',
  'h4',
  'a',
  'code',
  'hr',
] as const;

/** Tags allowed in the "inline" editor variant (short card/SEO description fields). */
export const RICH_TEXT_INLINE_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'a'] as const;

/** URL schemes an `<a href>` may use; anything else is unwrapped to plain text. */
export const RICH_TEXT_ALLOWED_URL_SCHEMES = ['http', 'https', 'mailto'] as const;

/** Plain-text character limits — unchanged from the current DTO limits, now measured on text, not markup. */
export const EVENT_DESCRIPTION_TEXT_MAX = 5000;
export const EVENT_OVERVIEW_TEXT_MAX = 5000;
export const SESSION_DESCRIPTION_TEXT_MAX = 500;
export const SESSION_OVERVIEW_TEXT_MAX = 5000;

/** Hard cap on the stored markup, so markup overhead can't be used to blow up a row. */
export const RICH_TEXT_HTML_MAX = 40000;

export type RichTextFullTag = (typeof RICH_TEXT_FULL_TAGS)[number];
export type RichTextInlineTag = (typeof RICH_TEXT_INLINE_TAGS)[number];
export type RichTextAllowedUrlScheme = (typeof RICH_TEXT_ALLOWED_URL_SCHEMES)[number];
