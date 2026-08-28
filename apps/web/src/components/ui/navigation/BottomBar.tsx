import type { ReactNode } from 'react';

export interface BottomBarProps {
  children?: ReactNode;
  className?: string;
  fixed?: boolean;
}

const BottomBar = ({ children, className = '', fixed = true, ...rest }: BottomBarProps) => {
  const positionClass = fixed
    ? 'fixed bottom-0 left-0 right-0 z-50'
    : 'absolute bottom-0 left-0 right-0 z-10';
  const baseClass =
    'min-h-14 bg-[var(--color-dew)] border-t border-[var(--color-mist)] flex items-center justify-between gap-4 px-4 py-3';
  const combined = [positionClass, baseClass, className].filter(Boolean).join(' ');
  return (
    <div className={combined} role="group" aria-label="Page actions" {...rest}>
      {children}
    </div>
  );
};

export default BottomBar;
