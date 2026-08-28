/**
 * Utility functions for HTML entity encoding/decoding
 */

/**
 * Decode HTML entities to their actual characters.
 * This is needed because the API escapes HTML entities for security,
 * but we need to display them correctly in React.
 *
 * Note: This does not parse HTML and is safe to render as plain text.
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
