import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title?: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="py-12 text-center flex flex-col items-center justify-center">
        <Icon className="h-12 w-12 text-muted-foreground mb-4" />
        {title && <h3 className="text-lg font-medium mb-2">{title}</h3>}
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">{description}</p>
        {action && <div>{action}</div>}
      </CardContent>
    </Card>
  );
}
