import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notification.service';

/**
 * Custom hook to manage notification state, 30s polling, tab visibility pausing,
 * and unread count increase notifications.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newToast, setNewToast] = useState(null);

  const prevCountRef = useRef(null);
  const initialFetchDoneRef = useRef(false);

  // Fetch full notification list
  const fetchList = useCallback(async () => {
    try {
      setError(null);
      const data = await getNotifications({ limit: 15 });
      setNotifications(data.notifications || []);
      if (typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
        prevCountRef.current = data.unreadCount;
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll only the count (lightweight)
  const pollCount = useCallback(async () => {
    try {
      const data = await getUnreadCount();
      const current = data.unreadCount ?? data.count ?? 0;

      // Detect increase
      if (prevCountRef.current !== null && current > prevCountRef.current) {
        setNewToast({
          id: Date.now(),
          type: 'info',
          message: `You have ${current - prevCountRef.current} new notification${current - prevCountRef.current > 1 ? 's' : ''}`,
        });
        // Also refresh the notification list so dropdown has fresh data
        getNotifications({ limit: 15 })
          .then((res) => setNotifications(res.notifications || []))
          .catch(() => {});
      }

      prevCountRef.current = current;
      setUnreadCount(current);
    } catch {
      // Silently ignore polling errors so UX isn't interrupted
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true;
      fetchList();
    }
  }, [fetchList]);

  // 30-second polling with visibility pause
  useEffect(() => {
    const interval = setInterval(() => {
      // Pause polling while browser tab is hidden
      if (document.visibilityState === 'hidden') {
        return;
      }
      pollCount();
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pollCount]);

  // Mark one read
  const markOneRead = useCallback(async (id) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true, readAt: new Date() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    if (prevCountRef.current !== null) {
      prevCountRef.current = Math.max(0, prevCountRef.current - 1);
    }

    try {
      await markNotificationRead(id);
    } catch {
      // Revert if error
      fetchList();
    }
  }, [fetchList]);

  // Mark all read
  const markAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
    );
    setUnreadCount(0);
    prevCountRef.current = 0;

    try {
      await markAllNotificationsRead();
    } catch {
      fetchList();
    }
  }, [fetchList]);

  const clearToast = useCallback(() => {
    setNewToast(null);
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    newToast,
    clearToast,
    refreshList: fetchList,
    markOneRead,
    markAllRead,
  };
}

export default useNotifications;
