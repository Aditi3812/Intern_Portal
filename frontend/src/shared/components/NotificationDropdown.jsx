import { useEffect, useRef } from 'react';
import './NotificationBell.css';

/**
 * Format timestamp to friendly relative time.
 */
function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get an appropriate badge or icon based on notification type.
 */
function getTypeBadge(type = '') {
  switch (type.toUpperCase()) {
    case 'REQUEST_SUBMITTED':
      return { icon: '📥', color: 'badge-blue', label: 'Submitted' };
    case 'REQUEST_FORWARDED':
      return { icon: '↗️', color: 'badge-purple', label: 'Forwarded' };
    case 'REQUEST_APPROVED':
      return { icon: '✅', color: 'badge-green', label: 'Approved' };
    case 'REQUEST_REJECTED':
      return { icon: '❌', color: 'badge-red', label: 'Rejected' };
    case 'CERTIFICATE_SENT':
      return { icon: '📜', color: 'badge-gold', label: 'Certificate' };
    case 'ARCHIVE_WARNING':
      return { icon: '⚠️', color: 'badge-amber', label: 'Notice' };
    case 'CERTIFICATE_REVOKED':
      return { icon: '⛔', color: 'badge-red', label: 'Revoked' };
    default:
      return { icon: '🔔', color: 'badge-gray', label: 'Notification' };
  }
}

export default function NotificationDropdown({
  isOpen,
  notifications = [],
  unreadCount = 0,
  loading = false,
  error = null,
  onClose,
  onMarkOneRead,
  onMarkAllRead,
  onNotificationClick,
  onRetry,
}) {
  const dropdownRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };

    // Use mousedown so it fires before click handlers elsewhere
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="notif-dropdown"
      role="region"
      aria-label="Notifications menu"
    >
      {/* Header */}
      <div className="notif-header">
        <div className="notif-header-title">
          <span className="notif-title-text">Notifications</span>
          {unreadCount > 0 && (
            <span className="notif-unread-chip">{unreadCount} new</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            className="notif-mark-all-btn"
            onClick={onMarkAllRead}
            title="Mark all notifications as read"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Body */}
      <div className="notif-body">
        {loading && (
          <div className="notif-loading-state" role="status">
            <div className="notif-spinner" aria-hidden="true" />
            <p>Loading notifications…</p>
          </div>
        )}

        {!loading && error && (
          <div className="notif-error-state" role="alert">
            <span className="notif-error-icon" aria-hidden="true">⚠️</span>
            <p>{error}</p>
            {onRetry && (
              <button type="button" className="notif-retry-btn" onClick={onRetry}>
                Try again
              </button>
            )}
          </div>
        )}

        {!loading && !error && notifications.length === 0 && (
          <div className="notif-empty-state">
            <div className="notif-empty-icon" aria-hidden="true">🎉</div>
            <p className="notif-empty-title">You're all caught up</p>
            <p className="notif-empty-subtitle">
              No new notifications right now. Any status changes will appear here.
            </p>
          </div>
        )}

        {!loading && !error && notifications.length > 0 && (
          <ul className="notif-list" role="list">
            {notifications.map((notif) => {
              const { icon, color, label } = getTypeBadge(notif.type);
              const isUnread = !notif.isRead;

              return (
                <li
                  key={notif._id}
                  className={`notif-item ${isUnread ? 'is-unread' : 'is-read'}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onNotificationClick(notif)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onNotificationClick(notif);
                    }
                  }}
                  aria-label={`${isUnread ? 'Unread: ' : ''}${notif.title}`}
                >
                  <div className={`notif-type-icon ${color}`} aria-hidden="true">
                    <span>{icon}</span>
                  </div>

                  <div className="notif-content">
                    <div className="notif-item-top">
                      <span className="notif-item-title">{notif.title}</span>
                      <span className="notif-item-time">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>

                    <p className="notif-item-message">{notif.message}</p>

                    <div className="notif-item-footer">
                      <span className={`notif-badge-pill ${color}`}>{label}</span>
                      {isUnread && (
                        <button
                          type="button"
                          className="notif-read-dot-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkOneRead(notif._id);
                          }}
                          title="Mark as read"
                        >
                          <span className="notif-unread-dot" aria-label="Mark read" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
