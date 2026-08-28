'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface OrDividerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Horizontal divider with centered label (e.g. "Optional", "autofilled details").
 * Uses theme-aware background so it works in light and dark mode.
 */
export function OrDivider({ children, className }: OrDividerProps) {
  return (
    <div className={cn('relative my-8', className)}>
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-background px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {children}
        </span>
      </div>
    </div>
  );
}
