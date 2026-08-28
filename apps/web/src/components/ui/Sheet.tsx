import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

type Side = 'top' | 'right' | 'bottom' | 'left';

export interface SheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = createContext<SheetContextValue | null>(null);

function useSheetContext() {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error('Sheet components must be used within Sheet (Root).');
  return ctx;
}

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/**
 * Root component for a controlled sheet/drawer. Use with SheetTrigger and SheetContent.
 */
export function Sheet({ open, onOpenChange, children }: SheetProps) {
  return <SheetContext.Provider value={{ open, onOpenChange }}>{children}</SheetContext.Provider>;
}

export interface SheetTriggerProps {
  children: ReactNode;
  asChild?: boolean;
  className?: string;
  /** Accessible label for the trigger (e.g. "Open navigation menu"). */
  'aria-label'?: string;
}

/**
 * Trigger that opens the sheet. Renders a button by default; pass asChild to merge into a child element.
 */
export function SheetTrigger({
  children,
  asChild = false,
  className = '',
  'aria-label': ariaLabel = 'Open menu',
  onClick,
  ...rest
}: SheetTriggerProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { onOpenChange } = useSheetContext();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      onOpenChange(true);
    },
    [onOpenChange, onClick],
  );

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(
      children as React.ReactElement<{ onClick?: React.MouseEventHandler<HTMLElement> }>,
      {
        onClick: handleClick,
        ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
      } as Record<string, unknown>,
    );
  }

  const baseClass =
    'p-2 rounded-lg inline-flex items-center justify-center text-[var(--color-stem)] hover:bg-[var(--color-mist)] hover:text-[var(--color-soil)] transition-colors';
  const combined = [baseClass, className].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={combined}
      aria-label={ariaLabel}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </button>
  );
}

const SIDE_CLASSES: Record<Side, string> = {
  top: 'inset-x-0 top-0 border-b rounded-b-lg',
  right: 'inset-y-0 right-0 border-l w-full max-w-[280px]',
  bottom: 'inset-x-0 bottom-0 border-t rounded-t-lg',
  left: 'inset-y-0 left-0 border-r w-full max-w-[280px]',
};

const SIDE_TRANSLATE: Record<Side, { from: string; to: string }> = {
  top: { from: '-translate-y-full', to: 'translate-y-0' },
  right: { from: 'translate-x-full', to: 'translate-x-0' },
  bottom: { from: 'translate-y-full', to: 'translate-y-0' },
  left: { from: '-translate-x-full', to: 'translate-x-0' },
};

export interface SheetContentProps {
  side?: Side;
  className?: string;
  children: ReactNode;
}

const ANIMATION_MS = 300;

/**
 * Sheet panel content. Renders in a portal with overlay. Includes a close button and closes on overlay click and Escape.
 */
export function SheetContent({
  side = 'right',
  className = '',
  children,
}: SheetContentProps): ReactElement | null {
  const { open, onOpenChange } = useSheetContext();
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = open || isClosing;

  useEffect(() => {
    if (open) {
      setIsClosing(false);
      const t = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(t);
    }
    return undefined;
  }, [open]);

  const close = useCallback(() => {
    if (!open) return;
    setIsVisible(false);
    setIsClosing(true);
    timeoutRef.current = setTimeout(() => {
      setIsClosing(false);
      onOpenChange(false);
      timeoutRef.current = null;
    }, ANIMATION_MS);
  }, [open, onOpenChange]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    if (show) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [show, close]);

  if (!show) return null;

  const { from: translateFrom, to: translateTo } = SIDE_TRANSLATE[side];
  const contentTranslate = isVisible ? translateTo : translateFrom;
  const overlayOpacity = isVisible ? 'opacity-100' : 'opacity-0';

  const overlay = (
    <div
      role="presentation"
      tabIndex={-1}
      className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 ${overlayOpacity}`}
      onClick={close}
      onKeyDown={(e) => e.key === 'Enter' && close()}
    />
  );

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className={[
        'fixed z-50 bg-[var(--color-dew)] shadow-xl flex flex-col transition-transform duration-300 ease-out',
        SIDE_CLASSES[side],
        contentTranslate,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-mist)]">
        <span className="text-lg font-semibold text-[var(--color-soil)]">Menu</span>
        <button
          type="button"
          onClick={close}
          className="p-2 rounded-lg text-[var(--color-stem)] hover:bg-[var(--color-mist)] hover:text-[var(--color-soil)] transition-colors"
          aria-label="Close menu"
        >
          <span aria-hidden>×</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
    </div>
  );

  return createPortal(
    <>
      {overlay}
      {content}
    </>,
    document.body,
  );
}

export interface SheetHeaderProps {
  className?: string;
  children?: ReactNode;
}

export function SheetHeader({ className = '', children }: SheetHeaderProps) {
  const combined = ['flex flex-col gap-2', className].filter(Boolean).join(' ');
  return <div className={combined}>{children}</div>;
}

export interface SheetTitleProps {
  className?: string;
  children?: ReactNode;
}

export function SheetTitle({ className = '', children }: SheetTitleProps) {
  const combined = ['text-lg font-semibold text-[var(--color-soil)]', className]
    .filter(Boolean)
    .join(' ');
  return <h2 className={combined}>{children}</h2>;
}
