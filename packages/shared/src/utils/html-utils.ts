/**
 * Decode a subset of HTML entities into their character equivalents.
 *
 * Note: This is intended for displaying API-provided strings that may be HTML-entity encoded
 * (e.g. `Tom &amp; Jerry`). It does not parse HTML and is safe to render as plain text.
 */
export function decodeHtmlEntities(text: string | null | undefined): string {
  if (!text) return '';

  const entityMap: Readonly<Record<string, string>> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&#39;': "'",
    '&apos;': "'",
  } as const;

  return text.replace(/&[#\w]+;/g, (entity) => entityMap[entity] ?? entity);
}

/** Tags whose presence marks a value as editor-produced rich text. */
const RICH_TEXT_TAG_PATTERN =
  /<\/?(p|br|strong|b|em|i|u|s|ul|ol|li|blockquote|h1|h2|h3|h4|h5|h6|a|code|pre|hr|div|span)(\s[^>]*)?\/?>/i;

/** `<script>` / `<style>` subtrees, whose text content must never surface as plain text. */
const NON_TEXT_SUBTREE_PATTERN = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

/** Block-level closings (and `<hr>`) that become a paragraph break in plain text. */
const BLOCK_BREAK_PATTERN = /<\/(p|h[1-6]|blockquote|ul|ol|div|pre)\s*>|<hr\s*\/?>/gi;

/** `&nbsp;` decodes to a regular space for plain-text projections only. */
function decodeRichTextEntities(text: string): string {
  return decodeHtmlEntities(text.replace(/&nbsp;/gi, ' '));
}

/** Escape the five characters that would otherwise be interpreted as markup. */
function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Collapse runs of blank lines to a single blank line and trim surrounding whitespace. */
function normalizePlainTextWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * True when `value` already contains rich-text block/inline markup produced by the editor.
 *
 * Legacy values are HTML-escaped plain text (`&lt;p&gt;`), so they contain no raw tags and
 * return `false`.
 */
export function isRichTextHtml(value: string | null | undefined): boolean {
  if (!value) return false;
  return RICH_TEXT_TAG_PATTERN.test(value);
}

/**
 * Flatten rich text to a single plain-text string: entities decoded, `<li>` prefixed with "• ",
 * block ends and `<br>` collapsed to newlines, runs of blank lines collapsed to one.
 *
 * Legacy escaped plain text is passed through entity decoding untouched.
 */
export function richTextToPlainText(html: string | null | undefined): string {
  if (!html) return '';
  if (!isRichTextHtml(html)) return decodeHtmlEntities(html).trim();

  const withoutNonTextSubtrees = html.replace(NON_TEXT_SUBTREE_PATTERN, '');
  const withBreaks = withoutNonTextSubtrees
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n• ')
    .replace(BLOCK_BREAK_PATTERN, '\n\n');
  const withoutTags = withBreaks.replace(/<[^>]*>/g, '');

  return normalizePlainTextWhitespace(decodeRichTextEntities(withoutTags));
}

/**
 * Convert legacy plain text to HTML: escape, split on blank lines into `<p>`, single newlines
 * to `<br>`. Returns `null` when there is nothing to render.
 */
export function plainTextToRichTextHtml(text: string | null | undefined): string | null {
  if (!text) return null;

  const decoded = decodeRichTextEntities(text).replace(/\r\n?/g, '\n');
  if (!decoded.trim()) return null;

  const paragraphs = decoded
    .split(/\n[^\S\n]*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => `<p>${escapeHtmlText(paragraph).replace(/\n/g, '<br>')}</p>`);

  if (paragraphs.length === 0) return null;
  return paragraphs.join('');
}

/**
 * True when the value has no visible content (`null`, `''`, `<p></p>`, `<p><br></p>`,
 * whitespace only).
 */
export function isRichTextEmpty(value: string | null | undefined): boolean {
  if (!value) return true;

  const withoutNonTextSubtrees = value.replace(NON_TEXT_SUBTREE_PATTERN, '');
  const textOnly = decodeRichTextEntities(withoutNonTextSubtrees.replace(/<[^>]*>/g, ''));

  return textOnly.replace(/\s/g, '').length === 0;
}
