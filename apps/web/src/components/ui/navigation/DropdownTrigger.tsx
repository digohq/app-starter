import type { ReactNode } from 'react';

export interface DropdownTriggerProps {
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
  'aria-expanded'?: boolean;
  [key: string]: unknown;
}

const DropdownTrigger = ({
  icon,
  children,
  className = '',
  'aria-expanded': ariaExpanded,
  ...rest
}: DropdownTriggerProps) => {
  const baseClass =
    'inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-dew)] border border-[var(--color-mist)] text-[var(--color-soil)] text-sm font-medium rounded-full hover:opacity-90 transition-colors';
  const combined = [baseClass, className].filter(Boolean).join(' ');
  return (
    <button
      type="button"
      className={combined}
      aria-expanded={ariaExpanded}
      aria-haspopup="true"
      {...rest}
    >
      {icon && <span className="flex-shrink-0 w-4 h-4 inline-flex">{icon}</span>}
      {children}
    </button>
  );
};

export default DropdownTrigger;
