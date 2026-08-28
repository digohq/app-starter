/**
 * Utility functions for sanitizing user input to prevent XSS attacks
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Remove HTML tags from string
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize string input by trimming and escaping HTML
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) {
    return '';
  }
  return escapeHtml(input.trim());
}

/**
 * Sanitize optional string input
 */
export function sanitizeOptionalString(input: string | null | undefined): string | null {
  if (!input) {
    return null;
  }
  const trimmed = input.trim();
  return trimmed ? escapeHtml(trimmed) : null;
}
