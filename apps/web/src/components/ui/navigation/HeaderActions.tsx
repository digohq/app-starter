import type { ReactNode } from 'react';

export interface HeaderActionsProps {
  children?: ReactNode;
  className?: string;
}

const HeaderActions = ({ children, className = '', ...rest }: HeaderActionsProps) => {
  const baseClass = 'flex items-center gap-2';
  const combined = [baseClass, className].filter(Boolean).join(' ');
  return (
    <div className={combined} {...rest}>
      {children}
    </div>
  );
};

export default HeaderActions;
