'use client';

import React, { useState } from 'react';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { NotificationCategoryCard } from './NotificationCategoryCard';
import { BulkPreferenceControls } from './BulkPreferenceControls';
import { Loader2, AlertCircle } from 'lucide-react';
import { BulkUpdateOptions } from '@/types/notifications';

interface NotificationPreferencesContentProps {
  initialOrganizationId?: string;
}

export const NotificationPreferencesContent: React.FC<NotificationPreferencesContentProps> = ({
  initialOrganizationId,
}) => {
  const [organizationId, setOrganizationId] = useState<string | null>(
    initialOrganizationId || null,
  );
  const { preferences, isLoading, error, updatePreferences, updateBulkPreferences, isUpdating } =
    useNotificationPreferences(organizationId);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 p-4 text-destructive bg-destructive/10">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <h5 className="font-medium leading-none tracking-tight">Error</h5>
        </div>
        <div className="mt-2 text-sm opacity-90">
          Failed to load notification preferences. Please try refreshing the page.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose how you want to be notified about activity.
          </p>
        </div>
        <BulkPreferenceControls
          onBulkUpdate={(action, options) =>
            updateBulkPreferences({ action, options: options as BulkUpdateOptions })
          }
          isLoading={isUpdating}
        />
      </div>

      <div className="space-y-6">
        {preferences.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/10">
            <p className="text-muted-foreground">No preferences available to configure.</p>
          </div>
        ) : (
          preferences.map((organization) => (
            <NotificationCategoryCard
              key={organization.category}
              organization={organization}
              onUpdate={(updates) =>
                updatePreferences({
                  preferences: updates.map((u) => ({
                    ...u,
                    definitionName: u.definitionName || undefined,
                  })),
                })
              }
              isLoading={isUpdating}
            />
          ))
        )}
      </div>
    </div>
  );
};
