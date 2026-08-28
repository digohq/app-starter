import { InAppNotification } from '@/types/notifications';
import {
  getNotificationIcon,
  getNotificationColor,
  formatNotificationTime,
  getNotificationActionText,
} from '@/lib/notifications/utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import Link from 'next/link';

interface NotificationItemProps {
  notification: InAppNotification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function NotificationItem({ notification, onRead, onDismiss }: NotificationItemProps) {
  const Icon = getNotificationIcon(notification.type, notification.data?.invitationType);
  const colorClass = getNotificationColor(notification.type, notification.data?.invitationType);
  const actionText = getNotificationActionText(
    notification.type,
    notification.data?.invitationType,
  );

  return (
    <div
      className={cn(
        'relative flex gap-4 p-4 transition-colors hover:bg-muted/50 organization border-b last:border-0',
        !notification.read && 'bg-muted/30',
      )}
      onClick={() => !notification.read && onRead(notification.id)}
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full mt-1',
          colorClass,
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <p
          className={cn('text-sm font-medium leading-none', !notification.read && 'font-semibold')}
        >
          {notification.title}
        </p>
        <p className="text-sm text-muted-foreground line-clamp-2 break-words">
          {notification.description || notification.data?.body}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
          <span>{formatNotificationTime(notification.createdAt)}</span>
          {notification.data?.entityName && (
            <>
              <span>•</span>
              <span className="font-medium text-foreground truncate max-w-[150px]">
                {notification.data.entityName}
              </span>
            </>
          )}
        </div>

        {notification.data?.actionUrl && (
          <div className="pt-2">
            <Button size="sm" variant="secondary" asChild className="h-7 text-xs">
              <Link href={notification.data.actionUrl}>{actionText}</Link>
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        {!notification.read && <span className="h-2 w-2 rounded-full bg-primary mt-2" />}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground opacity-0 transition-opacity organization-hover:opacity-100 hover:text-foreground hover:bg-transparent"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss(notification.id);
          }}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>
    </div>
  );
}
