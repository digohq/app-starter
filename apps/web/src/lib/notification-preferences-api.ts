import { apiClient } from './api-client';
import {
  NotificationPreferencesResponse,
  NotificationCategoriesResponse,
  NotificationPreferenceUpdate,
  BulkUpdateAction,
  BulkUpdateOptions,
} from '../types/notifications';

export const notificationPreferencesApi = {
  getPreferences: async (params?: {
    organizationId?: string | null;
    includeDefaults?: boolean;
  }) => {
    const query = new URLSearchParams();
    if (params?.organizationId) query.append('organizationId', params.organizationId);
    if (params?.includeDefaults !== undefined)
      query.append('includeDefaults', String(params.includeDefaults));

    return apiClient.get<NotificationPreferencesResponse>(
      `/api/notifications/preferences?${query.toString()}`,
    );
  },

  getCategories: async () => {
    return apiClient.get<NotificationCategoriesResponse>(
      '/api/notifications/preferences/categories',
    );
  },

  updatePreferences: async (data: {
    organizationId?: string | null;
    preferences: NotificationPreferenceUpdate[];
  }) => {
    return apiClient.put<any>('/api/notifications/preferences', data);
  },

  bulkUpdatePreferences: async (action: BulkUpdateAction, options: BulkUpdateOptions) => {
    return apiClient.put<any>('/api/notifications/preferences/bulk', {
      action,
      ...options,
    });
  },
};
