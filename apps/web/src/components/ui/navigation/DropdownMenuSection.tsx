import type { ReactNode } from 'react';

export interface DropdownMenuSectionProps {
  children?: ReactNode;
  className?: string;
  divider?: boolean;
}

const DropdownMenuSection = ({
  children,
  className = '',
  divider = false,
  ...rest
}: DropdownMenuSectionProps) => {
  const baseClass = 'py-1';
  const withDivider = divider ? 'border-b border-[var(--color-mist)]' : '';
  const combined = [baseClass, withDivider, className].filter(Boolean).join(' ');
  return (
    <div className={combined} {...rest}>
      {children}
    </div>
  );
};

export default DropdownMenuSection;
