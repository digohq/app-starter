import Link from 'next/link';
import { cn, decodeHtml } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/** Truncates for display; keeps total length at most maxLength (ellipsis counts toward the cap). */
export function truncateBreadcrumbLabel(
  text: string,
  maxLength: number,
): { display: string; full: string } {
  const full = text;
  if (full.length <= maxLength) {
    return { display: full, full };
  }
  return { display: `${full.slice(0, Math.max(0, maxLength - 3))}...`, full };
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  /** When set, the last crumb's visible label is capped at this length with trailing "..."; full text is exposed via title and aria-label when truncated. */
  truncateLastItemAt?: number;
}

export const Breadcrumbs = ({ items, className, truncateLastItemAt }: BreadcrumbsProps) => {
  if (!items || items.length === 0) {
    return null;
  }

  const lastIndex = items.length - 1;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-med font-medium text-muted-foreground', className)}
    >
      <ol className="inline-flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === lastIndex;
          const decodedLabel = decodeHtml(item.label);
          const { display, full } =
            isLast && truncateLastItemAt != null
              ? truncateBreadcrumbLabel(decodedLabel, truncateLastItemAt)
              : { display: decodedLabel, full: decodedLabel };
          const isTruncated = display !== full;

          return (
            <li
              key={`${item.label}-${index}`}
              className="inline-flex items-center gap-1"
              aria-current={isLast ? 'page' : undefined}
            >
              {index > 0 && (
                <span className="text-muted-foreground/70" aria-hidden>
                  /
                </span>
              )}
              {item.href ? (
                <Link
                  href={item.href}
                  title={isTruncated ? full : undefined}
                  aria-label={isTruncated ? full : undefined}
                  className={cn(
                    'inline-flex items-center gap-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm',
                    isLast ? 'font-medium text-foreground' : null,
                  )}
                >
                  <span>{display}</span>
                </Link>
              ) : (
                <span
                  title={isTruncated ? full : undefined}
                  aria-label={isTruncated ? full : undefined}
                  className={cn(
                    'inline-flex items-center gap-1',
                    isLast ? 'font-medium text-foreground' : null,
                  )}
                >
                  {display}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
