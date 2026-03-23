import { useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import styles from './Sidebar.module.scss';
import { chatApi } from '../../api/chats';
import { Link, useNavigate } from 'react-router';
import { authApi } from '../../api/auth';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import { FORMAT_PROMPT } from '../../utils/system-settings';
import { SidebarToggleIcon, PlusIcon, LoginIcon, UserIcon, LogoutIcon } from '../../assets/icons';
import ChatItem from './ChatItem';

export default function Sidebar() {
  const navigate = useNavigate();

  const chats = useChatStore((s) => s.chats);
  const setChats = useChatStore((s) => s.setChats);
  const createChat = useChatStore((s) => s.createChat);
  const user = useChatStore(s => s.user);
  const isGuest = useChatStore(s => s.isGuest);
  const sidebarOpen = useChatStore((s) => s.sidebarOpen);
  const toggleSidebar = useChatStore((s) => s.toggleSidebar);
  const { isChatLoading, setIsChatLoading } = useChatStore((s) => s);

  useEffect(() => {
    if (isGuest) return;
    const loadChats = async () => {
      await chatApi.getChats().then(res => setChats(res.map(c => ({ ...c, messages: [] }))));
    }
    loadChats();
  }, [isGuest])

  const handleCreateChat = async () => {
    setIsChatLoading(true);
    try {
      const chat = await createChat('Новый чат', FORMAT_PROMPT);
      navigate(`/chats/${chat.id}`);
      if (window.innerWidth < 768) toggleSidebar();
      setIsChatLoading(false);
    } catch (e) {
      console.error("Failed to create chat:", e);
      setIsChatLoading(false);
    }
  };

  return (
    <aside className={`${styles.sidebar} ${!sidebarOpen ? styles['sidebar--collapsed'] : styles['sidebar--open']}`}>
      <div className={styles['sidebar__content']}>
        <div className={styles['sidebar__header']}>
          <span className={styles['sidebar__logo']}>vakachat</span>

          <div className={styles['header-sidebar__flex']}>
            <button className={styles['sidebar__toggle']} onClick={toggleSidebar}>
              <SidebarToggleIcon width="16" height="16" />
            </button>

            <ThemeToggle />
          </div>
        </div>

        <div className={styles['sidebar__chats']}>
          {chats.length === 0 && (
            <p className={styles['sidebar__empty-hint']}>Нет чатов. Создай первый!</p>
          )}
          {chats.map((chat) => (
            <ChatItem key={chat.id} chat={chat} />
          ))}
        </div>

        <div className={styles['sidebar__new-chat']}>
          <button onClick={handleCreateChat} className={styles['sidebar__new-chat-btn']} disabled={isChatLoading}>
            <PlusIcon width="14" height="14" />
            <span>Новый чат</span>
          </button>
        </div>

        {isGuest ? (
          <div className={styles['sidebar__guest']}>
            <Link to="/login" className={`${styles['sidebar__guest-btn']} ${styles['sidebar__guest-btn--login']}`}>
              <LoginIcon width="14" height="14" />
              <span>Войти</span>
            </Link>
            <Link to="/register" className={`${styles['sidebar__guest-btn']} ${styles['sidebar__guest-btn--register']}`}>
              <UserIcon width="14" height="14" />
              <span>Зарегистрироваться</span>
            </Link>
          </div>
        ) : (
          <>
            <Link to="/profile" className={styles['sidebar__user']}>
              <div className={styles['sidebar__user-avatar']}>{(user && user.email[0])?.toUpperCase() || "A"}</div>
              <div className={styles['sidebar__user-info']}>
                <span className={styles['sidebar__user-name']}>{user && user.email}</span>
                <span className={styles['sidebar__user-tokens']}>
                  {user && parseFloat(String(user.balance)).toFixed(2)} ₽
                </span>
              </div>
            </Link>

            <button
              className={styles['sidebar__logout-btn']}
              onClick={() => { authApi.logout().then(() => window.location.reload()) }}
            >
              <LogoutIcon width="14" height="14" />
              <span>Выйти</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
