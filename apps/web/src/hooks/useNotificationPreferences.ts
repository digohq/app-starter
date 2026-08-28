import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationPreferencesApi } from '@/lib/notification-preferences-api';
import { toast } from 'sonner';
import {
  NotificationPreferenceUpdate,
  BulkUpdateAction,
  BulkUpdateOptions,
  NotificationPreferenceOrganization,
} from '@/types/notifications';

export const useNotificationPreferences = (organizationId?: string | null) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['notification-preferences', organizationId],
    queryFn: () =>
      notificationPreferencesApi.getPreferences({ organizationId, includeDefaults: true }),
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: (mutationData: { preferences: NotificationPreferenceUpdate[] }) =>
      notificationPreferencesApi.updatePreferences({
        organizationId,
        preferences: mutationData.preferences,
      }),
    onMutate: async (newData) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['notification-preferences', organizationId] });
      const previousPreferences = queryClient.getQueryData([
        'notification-preferences',
        organizationId,
      ]);

      queryClient.setQueryData(['notification-preferences', organizationId], (old: any) => {
        if (!old?.preferences) return old;

        const newPreferencesOrganizations = old.preferences.map(
          (organization: NotificationPreferenceOrganization) => ({
            ...organization,
            preferences: organization.preferences.map((pref) => {
              const update = newData.preferences.find(
                (u) =>
                  u.channel === pref.channel &&
                  u.type === pref.type &&
                  (u.definitionName === pref.definitionName ||
                    (!u.definitionName && !pref.definitionName)),
              );
              if (update) {
                return { ...pref, enabled: update.enabled };
              }
              return pref;
            }),
          }),
        );

        return { ...old, preferences: newPreferencesOrganizations };
      });

      return { previousPreferences };
    },
    onError: (err, variables, context) => {
      if (context?.previousPreferences) {
        queryClient.setQueryData(
          ['notification-preferences', organizationId],
          context.previousPreferences,
        );
      }
      toast.error('Error updating preferences', {
        description: 'Please try again.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', organizationId] });
    },
  });

  const updateBulkPreferencesMutation = useMutation({
    mutationFn: (params: { action: BulkUpdateAction; options: BulkUpdateOptions }) =>
      notificationPreferencesApi.bulkUpdatePreferences(params.action, {
        ...params.options,
        organizationId: organizationId || undefined,
      }),
    onSuccess: () => {
      toast.success('Preferences updated', {
        description: 'Your notification preferences have been updated.',
      });
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', organizationId] });
    },
    onError: () => {
      toast.error('Error updating preferences', {
        description: 'Please try again.',
      });
    },
  });

  return {
    preferences: data?.preferences ?? [],
    isLoading,
    error,
    updatePreferences: updatePreferencesMutation.mutate,
    updateBulkPreferences: updateBulkPreferencesMutation.mutate,
    isUpdating: updatePreferencesMutation.isPending || updateBulkPreferencesMutation.isPending,
  };
};
