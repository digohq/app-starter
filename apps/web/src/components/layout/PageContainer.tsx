import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

type ContainerVariant = 'default' | 'fluid' | 'form' | 'dashboard';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  variant?: ContainerVariant;
}

export function PageContainer({ children, className, variant = 'form' }: PageContainerProps) {
  const maxWidth = {
    default: 'max-w-7xl',
    fluid: 'max-w-full',
    form: 'max-w-4xl',
    dashboard: 'max-w-7xl', // Matching dashboard layout width often used
  };

  return (
    <div className={cn('container mx-auto px-4 py-8', maxWidth[variant], className)}>
      {children}
    </div>
  );
}
