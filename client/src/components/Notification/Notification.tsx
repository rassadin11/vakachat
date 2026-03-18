import { useEffect, useRef } from 'react';
import { useChatStore } from '../../store/chatStore';
import './Notification.scss';

const WarningIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <circle cx="12" cy="17" r="0.5" fill="currentColor" />
  </svg>
);

const AUTO_DISMISS_MS = 6000;

export default function Notification() {
  const notification = useChatStore((s) => s.notification);
  const setNotification = useChatStore((s) => s.setNotification);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!notification) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setNotification(null), AUTO_DISMISS_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [notification]);

  if (!notification) return null;

  return (
    <div className={`notification notification--${notification.type}`}>
      <button className="notification__close" onClick={() => setNotification(null)}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      <div className="notification__header">
        <span className="notification__icon">{WarningIcon}</span>
        <span className="notification__message">{notification.message}</span>
      </div>

      {notification.actionLabel && notification.actionHref && (
        <a className="notification__action" href={notification.actionHref}>
          {notification.actionLabel}
        </a>
      )}
    </div>
  );
}
