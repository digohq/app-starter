'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export interface SidebarItem {
  title: string;
  icon: React.ElementType;
  href: string;
}

interface SidebarNavProps {
  items: SidebarItem[];
  className?: string;
}

/**
 * A client component that renders interactive sidebar navigation links.
 */
export function SidebarNav({ items, className }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn('flex flex-col gap-2', className)}>
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

        return (
          <Button
            key={item.title}
            variant={isActive ? 'secondary' : 'ghost'}
            className={cn(
              'justify-start gap-3 px-3 py-2 w-full transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
            asChild
          >
            <Link href={item.href}>
              <item.icon className="w-4 h-4 text-inherit" />
              <span className="font-medium text-inherit">{item.title}</span>
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
