import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  NotificationPreferenceOrganization,
  NotificationPreferenceItem,
  NotificationChannel,
  NotificationType,
  NotificationCategory,
} from '@/types/notifications';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Mail, Smartphone, Bell, MessageSquare } from 'lucide-react';

interface NotificationCategoryCardProps {
  organization: NotificationPreferenceOrganization;
  onUpdate: (
    updates: {
      channel: NotificationChannel;
      definitionName: string | null;
      type: NotificationType;
      enabled: boolean;
      category?: NotificationCategory;
    }[],
  ) => void;
  isLoading?: boolean;
}

const ChannelIcon = ({ channel }: { channel: NotificationChannel }) => {
  switch (channel) {
    case NotificationChannel.EMAIL:
      return <Mail className="h-4 w-4" />;
    case NotificationChannel.SMS:
      return <Smartphone className="h-4 w-4" />;
    case NotificationChannel.IN_APP:
      return <Bell className="h-4 w-4" />;
    case NotificationChannel.PUSH:
      return <MessageSquare className="h-4 w-4" />;
    default:
      return null;
  }
};

export const NotificationCategoryCard: React.FC<NotificationCategoryCardProps> = ({
  organization,
  onUpdate,
  isLoading,
}) => {
  // Organization preferences by definition to show channels inline
  const definitions = React.useMemo(() => {
    const defs = new Map<string, NotificationPreferenceItem[]>();
    organization.preferences.forEach((pref) => {
      const key = pref.definitionName || 'generic_' + pref.type;
      if (!defs.has(key)) defs.set(key, []);
      defs.get(key)?.push(pref);
    });
    return Array.from(defs.values());
  }, [organization.preferences]);

  return (
    <Card className="mb-6 relative overflow-hidden">
      <CardHeader>
        <CardTitle>{organization.displayName}</CardTitle>
        <CardDescription>{organization.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {definitions.map((defPrefs) => {
          const first = defPrefs[0];
          const title = first.displayName;
          const description = first.description;

          return (
            <div
              key={first.id || first.definitionName}
              className="flex flex-col space-y-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0 border-b border-border/50 pb-4 last:border-0 last:pb-0"
            >
              <div className="space-y-1">
                <Label className="text-base font-medium">{title}</Label>
                <p className="text-xs text-muted-foreground max-w-md">{description}</p>
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                {defPrefs.map((pref) => (
                  <div
                    key={`${pref.channel}-${pref.id}`}
                    className="flex items-center space-x-2 bg-muted/30 p-2 rounded-md"
                  >
                    <Switch
                      id={`switch-${pref.id}`}
                      checked={pref.enabled}
                      disabled={!pref.canDisable || isLoading}
                      onCheckedChange={(checked) =>
                        onUpdate([
                          {
                            channel: pref.channel,
                            definitionName: pref.definitionName,
                            type: pref.type,
                            category: organization.category as NotificationCategory,
                            enabled: checked,
                          },
                        ])
                      }
                    />
                    <Label
                      htmlFor={`switch-${pref.id}`}
                      className="text-sm cursor-pointer flex items-center gap-1.5 font-normal"
                    >
                      <ChannelIcon channel={pref.channel} />
                      {pref.channel === NotificationChannel.IN_APP
                        ? 'In-App'
                        : pref.channel === NotificationChannel.EMAIL
                          ? 'Email'
                          : pref.channel}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
