import type { ElementType, ReactNode } from 'react';

export interface DropdownMenuItemProps {
  icon?: ReactNode;
  children?: ReactNode;
  as?: ElementType;
  className?: string;
  [key: string]: unknown;
}

const DropdownMenuItem = ({
  icon,
  children,
  as: Component = 'a',
  className = '',
  ...rest
}: DropdownMenuItemProps) => {
  const baseClass =
    'flex items-center gap-3 w-full px-4 py-3 text-sm text-[var(--color-soil)] hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors';
  const combined = [baseClass, className].filter(Boolean).join(' ');
  return (
    <Component className={combined} {...rest}>
      {icon && <span className="flex-shrink-0 text-gray-500">{icon}</span>}
      {children}
    </Component>
  );
};

export default DropdownMenuItem;
