import { apiClient } from './api-client';
import { GetNotificationsParams, NotificationResponse } from '@/types/notifications';

class NotificationApiClient {
  async getNotifications(params: GetNotificationsParams): Promise<NotificationResponse> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.unreadOnly) searchParams.append('unreadOnly', 'true');
    if (params.type) searchParams.append('type', params.type);
    if (params.since) searchParams.append('since', params.since);

    return apiClient.get<NotificationResponse>(
      `/api/notifications/in-app?${searchParams.toString()}`,
    );
  }

  async markAsRead(id: string): Promise<void> {
    await apiClient.put(`/api/notifications/in-app/${id}/read`, {});
  }

  async markAllAsRead(): Promise<{ updatedCount: number }> {
    return apiClient.put<{ updatedCount: number }>('/api/notifications/in-app/read-all', {});
  }

  async dismissNotification(id: string): Promise<void> {
    await apiClient.delete(`/api/notifications/in-app/${id}`);
  }

  async getUnreadCount(): Promise<{ count: number }> {
    return apiClient.get<{ count: number }>('/api/notifications/in-app/unread-count');
  }
}

export const notificationApi = new NotificationApiClient();
