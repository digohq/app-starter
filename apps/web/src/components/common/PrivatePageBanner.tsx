import React from 'react';
import { cn } from '@/lib/utils';
import { Lock, Link2 } from 'lucide-react';

export type VisibilityBannerVariant = 'private' | 'unlisted';

interface PrivatePageBannerProps {
  className?: string;
  variant?: VisibilityBannerVariant;
}

const BANNER_COPY: Record<VisibilityBannerVariant, { icon: React.ReactNode; text: string }> = {
  private: {
    icon: <Lock className="h-3 w-3" />,
    text: 'This page is set to private and is only visible to users that have been added as organizers.',
  },
  unlisted: {
    icon: <Link2 className="h-3 w-3" />,
    text: "This event/session is unlisted and won't appear in search or on public pages. Only people with the link can view it.",
  },
};

export const PrivatePageBanner: React.FC<PrivatePageBannerProps> = ({
  className,
  variant = 'private',
}) => {
  const { icon, text } = BANNER_COPY[variant];
  return (
    <div
      className={cn(
        'w-full py-2 bg-secondary/50 text-secondary-foreground text-center text-sm font-medium border-b flex items-center justify-center gap-2',
        className,
      )}
    >
      {icon}
      {text}
    </div>
  );
};
