import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageLoadingProps {
  message?: string;
  className?: string;
}

export function PageLoading({ message = 'Loading...', className }: PageLoadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[400px] w-full py-8',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p>{message}</p>
      </div>
    </div>
  );
}
