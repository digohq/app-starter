import * as React from 'react';

import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, value, ...props }, ref) => {
    const hasError = props['aria-invalid'] === true || (props as any)['data-error'] === true;

    // Ensure value is always a string (never undefined) to prevent uncontrolled/controlled warning
    // Only set value if it's provided in props (controlled component)
    const textareaProps = value !== undefined ? { ...props, value: value ?? '' } : props;

    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-colors',
          hasError
            ? 'border-destructive focus-visible:ring-destructive'
            : 'border-input focus-visible:ring-ring',
          className,
        )}
        ref={ref}
        {...textareaProps}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
