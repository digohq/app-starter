import type { ReactNode } from 'react';

export interface HeaderIconButtonProps {
  'aria-label': string;
  children?: ReactNode;
  className?: string;
  [key: string]: unknown;
}

const HeaderIconButton = ({
  'aria-label': ariaLabel,
  children,
  className = '',
  ...rest
}: HeaderIconButtonProps) => {
  const baseClass =
    'p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors inline-flex items-center justify-center';
  const combined = [baseClass, className].filter(Boolean).join(' ');
  return (
    <button type="button" className={combined} aria-label={ariaLabel} {...rest}>
      {children}
    </button>
  );
};

export default HeaderIconButton;
