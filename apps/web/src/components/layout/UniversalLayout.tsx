'use client';

import { ReactNode } from 'react';

interface UniversalLayoutProps {
  children: ReactNode;
  /** When true, removes horizontal padding from the content area (e.g. for full-bleed discover page). */
  noHorizontalPadding?: boolean;
}

export function UniversalLayout({ children, noHorizontalPadding }: UniversalLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div
        className={
          noHorizontalPadding
            ? 'w-full pt-2 pb-8'
            : 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8'
        }
      >
        {children}
      </div>
    </div>
  );
}
