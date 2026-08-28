'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface BackButtonProps {
  href?: string;
  label?: string;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  showIfHistoryExists?: boolean;
}

/**
 * Back button matching the design app event page (/events/2): link-style with ArrowLeft and label.
 */
export function BackButton({
  href,
  label = 'Back',
  children,
  className,
  onClick,
  showIfHistoryExists = false,
}: BackButtonProps) {
  const router = useRouter();
  const [hasHistory, setHasHistory] = useState(true);

  useEffect(() => {
    if (showIfHistoryExists && typeof window !== 'undefined') {
      setHasHistory(window.history.length > 1);
    }
  }, [showIfHistoryExists]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    } else if (showIfHistoryExists && !hasHistory) {
      window.close();
    } else {
      router.back();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm',
        className,
      )}
      aria-label={typeof (children || label) === 'string' ? `Go back` : 'Go back'}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
      {children ?? label}
    </button>
  );
}
