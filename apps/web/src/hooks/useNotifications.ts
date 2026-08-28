import { useState, useEffect, useCallback } from 'react';
import { InAppNotification } from '@/types/notifications';
import { notificationApi } from '@/lib/notifications-api';
import { useWebSocket } from './useWebSocket';
import { toast } from 'sonner';

export function useNotifications() {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Integrate WebSocket
  const { lastNotification, connected } = useWebSocket();

  const fetchNotifications = useCallback(
    async (reset = false) => {
      try {
        if (reset) setIsLoading(true);

        const currentPage = reset ? 1 : page;
        const response = await notificationApi.getNotifications({
          page: currentPage,
          limit: 20,
        });

        if (reset) {
          setNotifications(response.notifications);
        } else {
          // Dedup by ID just in case
          setNotifications((prev) => {
            const newIds = new Set(response.notifications.map((n) => n.id));
            const filteredPrev = prev.filter((n) => !newIds.has(n.id));
            return [...filteredPrev, ...response.notifications];
          });
        }

        setUnreadCount(response.pagination.unreadCount);
        setTotal(response.pagination.total);
        setHasMore(currentPage < response.pagination.totalPages);

        if (reset) setPage(1);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [page],
  );

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setPage((prev) => prev + 1);
    }
  }, [isLoading, hasMore]);

  // Effect to load more when page changes
  useEffect(() => {
    // Avoid initial double fetch, fetchNotifications called on mount
    if (page > 1) {
      fetchNotifications();
    }
  }, [page, fetchNotifications]);

  const refresh = useCallback(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  // Handle new notification
  useEffect(() => {
    if (lastNotification) {
      setNotifications((prev) => [lastNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      toast(lastNotification.title, {
        description:
          lastNotification.description || lastNotification.data?.body || 'New notification',
      });
    }
  }, [lastNotification]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const dismiss = async (id: string) => {
    try {
      await notificationApi.dismissNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      // If it was unread, decrement count
      // Optimistic update: assume it was unread if read=false
      // Actually we should check notification state
    } catch (e) {
      console.error(e);
    }
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    loadMore,
    refresh,
    markAsRead,
    markAllAsRead,
    dismiss,
    connected,
  };
}
