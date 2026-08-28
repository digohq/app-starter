import { ReactNode } from 'react';
import { PageContainer } from './PageContainer';
import { cn } from '@/lib/utils';

interface SidebarLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  className?: string;
  sidebarClassName?: string;
  contentClassName?: string;
}

/**
 * A reusable Server Component layout with a sidebar slot and content area.
 * Prevents "non-serializable" prop errors by using slots.
 */
export function SidebarLayout({
  children,
  sidebar,
  className,
  sidebarClassName,
  contentClassName,
}: SidebarLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-background', className)}>
      <PageContainer variant="fluid" className="px-8 mt-4">
        <div className="flex gap-8">
          <aside
            className={cn(
              'hidden md:block w-64 flex-shrink-0 border-r pr-8 h-[calc(100vh-8rem)] sticky top-24',
              sidebarClassName,
            )}
          >
            {sidebar}
          </aside>
          <main className={cn('flex-1 flex flex-col gap-8 min-w-0 pb-12', contentClassName)}>
            {children}
          </main>
        </div>
      </PageContainer>
    </div>
  );
}
