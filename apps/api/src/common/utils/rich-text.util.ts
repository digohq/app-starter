import sanitizeHtml from 'sanitize-html';
import {
  RICH_TEXT_ALLOWED_URL_SCHEMES,
  RICH_TEXT_FULL_TAGS,
  RICH_TEXT_INLINE_TAGS,
  isRichTextEmpty,
  isRichTextHtml,
  plainTextToRichTextHtml,
} from '@app-starter/shared';

/**
 * Which allowlist a description field is sanitized against.
 *
 * - `full` — long-form overview fields (lists, headings, blockquotes, rules).
 * - `inline` — short card/SEO description fields (emphasis and links only).
 */
export type RichTextVariant = 'inline' | 'full';

/** Attributes an anchor may keep. Every other attribute on every tag is stripped. */
const ALLOWED_ANCHOR_ATTRIBUTES = ['href', 'title', 'target', 'rel'] as const;

/** `rel` applied to every surviving anchor. */
const ANCHOR_REL = 'noopener noreferrer nofollow';

/** A tag name that is in neither allowlist, so transforming to it unwraps the element to text. */
const UNWRAP_TAG = 'span';

/** Leading `scheme:` of a URL, per RFC 3986. Anything obfuscated fails to match and is rejected. */
const URL_SCHEME_PATTERN = /^([a-zA-Z][a-zA-Z0-9+.-]*):/;

/**
 * Block tags rewritten so their content survives in a variant that does not allow them.
 * `full` keeps the heading hierarchy inside `h2`–`h4`; `inline` flattens every block to a
 * paragraph so list items become separate paragraphs instead of running together.
 */
const TAG_REWRITES: Readonly<Record<RichTextVariant, Readonly<Record<string, string>>>> = {
  full: { h1: 'h2', h5: 'h4', h6: 'h4' },
  inline: {
    li: 'p',
    h1: 'p',
    h2: 'p',
    h3: 'p',
    h4: 'p',
    h5: 'p',
    h6: 'p',
    blockquote: 'p',
  },
} as const;

/** True when `href` uses one of the allowed schemes. Scheme-less and obfuscated URLs are rejected. */
function isAllowedHref(href: string | undefined): boolean {
  if (!href) return false;

  const match = URL_SCHEME_PATTERN.exec(href.trim());
  if (!match) return false;

  return (RICH_TEXT_ALLOWED_URL_SCHEMES as readonly string[]).includes(match[1].toLowerCase());
}

/**
 * Rewrite an anchor: keep `href`/`title`, force `target="_blank"` and the hardened `rel`.
 * An anchor whose scheme is not allowed is turned into an unknown tag so `sanitize-html`
 * discards the element but keeps its text.
 */
function transformAnchor(_tagName: string, attribs: sanitizeHtml.Attributes) {
  if (!isAllowedHref(attribs.href)) {
    return { tagName: UNWRAP_TAG, attribs: {} };
  }

  const nextAttribs: Record<string, string> = {
    href: attribs.href.trim(),
    target: '_blank',
    rel: ANCHOR_REL,
  };
  if (attribs.title) nextAttribs.title = attribs.title;

  return { tagName: 'a', attribs: nextAttribs };
}

/** Build the `sanitize-html` options for a variant from the shared allowlists. */
function buildOptions(variant: RichTextVariant): sanitizeHtml.IOptions {
  const allowedTags = variant === 'full' ? RICH_TEXT_FULL_TAGS : RICH_TEXT_INLINE_TAGS;

  const transformTags: Record<string, string | sanitizeHtml.Transformer> = {
    ...TAG_REWRITES[variant],
    a: transformAnchor,
  };

  return {
    allowedTags: [...allowedTags],
    allowedAttributes: { a: [...ALLOWED_ANCHOR_ATTRIBUTES] },
    allowedSchemes: [...RICH_TEXT_ALLOWED_URL_SCHEMES],
    allowedSchemesAppliedToAttributes: ['href'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    // Drop the contents of these subtrees entirely instead of surfacing them as text.
    nonTextTags: ['script', 'style'],
    transformTags,
  };
}

/**
 * Sanitize editor output down to the stored rich-text contract for `variant`.
 *
 * Returns `null` when the input has no visible content, so an emptied editor stores the same
 * "no description" value as a field that was never filled in.
 */
export function sanitizeRichText(
  input: string | null | undefined,
  variant: RichTextVariant,
): string | null {
  if (!input) return null;

  const sanitized = sanitizeHtml(input, buildOptions(variant)).trim();

  return isRichTextEmpty(sanitized) ? null : sanitized;
}

/**
 * Accept either editor HTML or plain text from a non-UI writer (AI, import, MCP) and always
 * return stored-contract HTML. Plain text is routed through `plainTextToRichTextHtml` first so
 * its line breaks survive as paragraphs.
 */
export function normalizeRichTextInput(
  input: string | null | undefined,
  variant: RichTextVariant,
): string | null {
  if (!input) return null;

  const html = isRichTextHtml(input) ? input : plainTextToRichTextHtml(input);

  return sanitizeRichText(html, variant);
}
