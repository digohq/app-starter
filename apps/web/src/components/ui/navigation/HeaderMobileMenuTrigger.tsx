import type { ReactNode } from 'react';

export interface HeaderMobileMenuTriggerProps {
  children?: ReactNode;
  className?: string;
  'aria-label'?: string;
  [key: string]: unknown;
}

/**
 * Button intended for the header that is visible only on mobile (hidden from md breakpoint up).
 * Use as the trigger for a mobile navigation sheet/drawer. Pass the menu icon as children.
 */
const HeaderMobileMenuTrigger = ({
  children,
  className = '',
  'aria-label': ariaLabel = 'Open navigation menu',
  ...rest
}: HeaderMobileMenuTriggerProps) => {
  const baseClass =
    'md:hidden p-2 rounded-lg inline-flex items-center justify-center text-[var(--color-stem)] hover:bg-[var(--color-mist)] hover:text-[var(--color-soil)] transition-colors';
  const combined = [baseClass, className].filter(Boolean).join(' ');

  return (
    <button type="button" className={combined} aria-label={ariaLabel} {...rest}>
      {children}
    </button>
  );
};

export default HeaderMobileMenuTrigger;
