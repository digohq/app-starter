'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type VisibilityValue = 'PUBLIC' | 'UNLISTED' | 'PRIVATE';

const VISIBILITY_CONFIG: Record<
  VisibilityValue,
  { label: string; variant: 'teal' | 'outline' | 'secondary' }
> = {
  PUBLIC: { label: 'Public', variant: 'teal' },
  UNLISTED: { label: 'Unlisted', variant: 'outline' },
  PRIVATE: { label: 'Private', variant: 'secondary' },
};

interface VisibilityBadgeProps {
  visibility?: VisibilityValue | null;
  className?: string;
}

/**
 * Badge that displays event or session visibility (Public, Unlisted, Private).
 * Used on dashboard event/session cards and elsewhere.
 */
export function VisibilityBadge({ visibility, className }: VisibilityBadgeProps) {
  const value = (visibility ?? 'PRIVATE') as VisibilityValue;
  const config = VISIBILITY_CONFIG[value] ?? VISIBILITY_CONFIG.PRIVATE;
  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  );
}
