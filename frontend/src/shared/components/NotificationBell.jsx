import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useNotifications from '../hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';
import Toast from './Toast';
import './NotificationBell.css';

/**
 * Shared NotificationBell component.
 *
 * Props:
 *  - role: 'intern' | 'teamleader' | 'admin' (optional, fallback from user)
 *  - onTabChange: (tabName) => void (optional callback if dashboard uses internal tab state)
 */
export default function NotificationBell({ role = 'intern', onTabChange }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const {
    notifications,
    unreadCount,
    loading,
    error,
    newToast,
    clearToast,
    refreshList,
    markOneRead,
    markAllRead,
  } = useNotifications();

  const handleToggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        refreshList();
      }
      return next;
    });
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      await markOneRead(notif._id);
    }
    setIsOpen(false);

    // Role-based navigation
    const targetRole = String(role).toLowerCase();
    if (targetRole === 'intern') {
      if (onTabChange) onTabChange('certificates');
      navigate('/intern/dashboard?tab=certificates');
    } else if (targetRole === 'teamleader') {
      if (onTabChange) onTabChange('requests');
      navigate('/teamleader/dashboard?tab=requests');
    } else if (targetRole === 'admin') {
      if (onTabChange) onTabChange('requests');
      navigate('/admin/dashboard?tab=requests');
    }
  };

  return (
    <div className="notif-bell-container">
      {/* Toast when unread count increases during polling */}
      {newToast && (
        <div className="notif-toast-float">
          <Toast
            type={newToast.type}
            message={newToast.message}
            onClose={clearToast}
          />
        </div>
      )}

      {/* Bell Button */}
      <button
        type="button"
        id="notification-bell-btn"
        className={`notif-bell-btn ${isOpen ? 'is-active' : ''}`}
        onClick={handleToggle}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Notifications, ${unreadCount} unread`}
        title="Notifications"
      >
        <svg
          className="notif-bell-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="notif-badge" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      <NotificationDropdown
        isOpen={isOpen}
        notifications={notifications}
        unreadCount={unreadCount}
        loading={loading}
        error={error}
        onClose={() => setIsOpen(false)}
        onMarkOneRead={markOneRead}
        onMarkAllRead={markAllRead}
        onNotificationClick={handleNotificationClick}
        onRetry={refreshList}
      />
    </div>
  );
}
