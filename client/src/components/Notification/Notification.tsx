import { useEffect, useRef } from 'react';
import { useChatStore } from '../../store/chatStore';
import './Notification.scss';
import { WarningIcon, CloseIcon } from '../../assets/icons';

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
        <CloseIcon width="13" height="13" />
      </button>

      <div className="notification__header">
        <span className="notification__icon"><WarningIcon width="18" height="18" /></span>
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
