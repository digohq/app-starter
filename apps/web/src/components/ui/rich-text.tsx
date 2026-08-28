'use client';

import { useMemo, type CSSProperties } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import {
  RICH_TEXT_ALLOWED_URL_SCHEMES,
  RICH_TEXT_FULL_TAGS,
  RICH_TEXT_INLINE_TAGS,
  isRichTextEmpty,
  isRichTextHtml,
  plainTextToRichTextHtml,
} from '@app-starter/shared';
import { cn } from '@/lib/utils';

export type RichTextVariant = 'inline' | 'full';

export interface RichTextProps {
  /** Stored description HTML. Legacy plain text and `null` are both accepted. */
  html: string | null | undefined;
  className?: string;
  /** `inline` renders in a span-level wrapper, `full` in an `<article>`. */
  variant?: RichTextVariant;
  /** Clamp the rendered text to N lines, for card surfaces. */
  clamp?: number;
}

/** `a[href]` may only use the shared scheme allowlist; everything else is dropped. */
const ALLOWED_URI_REGEXP = new RegExp(`^(?:${RICH_TEXT_ALLOWED_URL_SCHEMES.join('|')}):`, 'i');

const ALLOWED_ATTR = ['href', 'title', 'target', 'rel'] as const;

const SANITIZE_CONFIG: Record<RichTextVariant, Parameters<typeof DOMPurify.sanitize>[1]> = {
  full: {
    ALLOWED_TAGS: [...RICH_TEXT_FULL_TAGS],
    ALLOWED_ATTR: [...ALLOWED_ATTR],
    ALLOWED_URI_REGEXP,
  },
  inline: {
    ALLOWED_TAGS: [...RICH_TEXT_INLINE_TAGS],
    ALLOWED_ATTR: [...ALLOWED_ATTR],
    ALLOWED_URI_REGEXP,
  },
};

let hasRegisteredAnchorHook = false;

/**
 * Force every surviving anchor to open safely, matching the API sanitizer's rewrite.
 *
 * Registered once per module load; this component is the only DOMPurify consumer on the web app.
 */
const registerAnchorHook = (): void => {
  if (hasRegisteredAnchorHook) return;
  hasRegisteredAnchorHook = true;

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (!(node instanceof Element) || node.tagName.toLowerCase() !== 'a') return;
    if (!node.getAttribute('href')) return;

    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer nofollow');
  });
};

/**
 * Render stored rich text.
 *
 * Legacy plain-text rows are converted to paragraphs first, then the markup is sanitized against
 * the same allowlist the API enforces on write — a no-op for well-formed content, and a safety net
 * for rows written before the sanitizer (or missed by the backfill).
 */
export const RichText = ({ html, className, variant = 'full', clamp }: RichTextProps) => {
  const sanitizedHtml = useMemo(() => {
    if (isRichTextEmpty(html)) return null;

    const normalized = isRichTextHtml(html) ? (html ?? '') : (plainTextToRichTextHtml(html) ?? '');
    if (!normalized) return null;

    registerAnchorHook();
    const sanitized = DOMPurify.sanitize(normalized, SANITIZE_CONFIG[variant]) as unknown as string;

    return isRichTextEmpty(sanitized) ? null : sanitized;
  }, [html, variant]);

  if (!sanitizedHtml) return null;

  const classes = cn(
    'rich-text',
    variant === 'inline' && 'rich-text--inline',
    clamp ? 'rich-text--clamp' : undefined,
    className,
  );
  const style = clamp ? ({ '--rich-text-clamp': clamp } as CSSProperties) : undefined;

  if (variant === 'inline') {
    return (
      <span className={classes} style={style} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
    );
  }

  return (
    <article
      className={classes}
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

export default RichText;
