import { createApiClient } from '@/shared/config/api.config';

const notificationApi = createApiClient();

/**
 * Fetch paginated notifications for current user.
 * @param {Object} [params]
 * @param {boolean|string} [params.unread]
 * @param {number} [params.page]
 * @param {number} [params.limit]
 */
export const getNotifications = async ({ unread, page = 1, limit = 20 } = {}) => {
  const params = { page, limit };
  if (unread !== undefined && unread !== null) {
    params.unread = unread;
  }
  const response = await notificationApi.get('/api/notifications', { params });
  return response.data;
};

/**
 * Fetch unread notification count.
 */
export const getUnreadCount = async () => {
  const response = await notificationApi.get('/api/notifications/unread-count');
  return response.data;
};

/**
 * Mark a single notification as read.
 * @param {string} id
 */
export const markNotificationRead = async (id) => {
  const response = await notificationApi.patch(`/api/notifications/${id}/read`);
  return response.data;
};

/**
 * Mark all notifications for the current user as read.
 */
export const markAllNotificationsRead = async () => {
  const response = await notificationApi.patch('/api/notifications/read-all');
  return response.data;
};

export default {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};
