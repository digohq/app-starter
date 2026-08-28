import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export interface DropdownMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  panelClassName?: string;
  align?: 'left' | 'right';
}

const DropdownMenu = ({
  open,
  onOpenChange,
  trigger,
  children,
  panelClassName = '',
  align = 'right',
  ...rest
}: DropdownMenuProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, onOpenChange]);

  const alignClass = align === 'right' ? 'right-0' : 'left-0';
  const panelBase =
    'absolute mt-2 w-56 bg-[var(--color-dew)] border border-[var(--color-mist)] rounded-xl shadow-lg overflow-hidden z-50';
  const panelCombined = [panelBase, alignClass, panelClassName].filter(Boolean).join(' ');

  return (
    <div className="relative" ref={containerRef} {...rest}>
      {trigger}
      {open && <div className={panelCombined}>{children}</div>}
    </div>
  );
};

export default DropdownMenu;
