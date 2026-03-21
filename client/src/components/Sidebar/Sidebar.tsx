import { useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import './Sidebar.scss';
import { chatApi } from '../../api/chats';
import { Link, useNavigate } from 'react-router';
import { authApi } from '../../api/auth';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import { FORMAT_PROMPT } from '../../utils/system-settings';
import { SidebarToggleIcon, ChatBubbleIcon, CloseIcon, PlusIcon, LoginIcon, UserIcon, LogoutIcon } from '../../assets/icons';

export default function Sidebar() {
  const navigate = useNavigate();

  const chats = useChatStore((s) => s.chats);
  const setChats = useChatStore((s) => s.setChats);
  const deleteChat = useChatStore((s) => s.deleteChat);
  const createChat = useChatStore((s) => s.createChat);
  const activeChat = useChatStore((s) => s.activeChat);
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

  const handleChatClick = () => {
    if (window.innerWidth < 768) {
      toggleSidebar();
    }
  }

  return (
    <aside className={`sidebar ${!sidebarOpen ? 'sidebar--collapsed' : 'sidebar--open'}`}>
      <div className="sidebar__content">
        <div className="sidebar__header">
          <span className="sidebar__logo">vakachat</span>

          <div className='header-sidebar__flex'>
            <button className="sidebar__toggle" onClick={toggleSidebar}>
              <SidebarToggleIcon width="16" height="16" />
            </button>

            <ThemeToggle />
          </div>
        </div>

        <div className="sidebar__chats">
          {chats.length === 0 && (
            <p className="sidebar__empty-hint">Нет чатов. Создай первый!</p>
          )}
          {chats.map((chat) => (
            <Link
              to={`/chats/${chat.id}`}
              key={chat.id}
              className={`sidebar__item ${activeChat?.id === chat.id ? 'sidebar__item--active' : ''}`}
              onClick={handleChatClick}
            >
              <ChatBubbleIcon className="sidebar__item-icon" width="14" height="14" />
              <span className="sidebar__item-title">{chat.title}</span>
              <button
                className="sidebar__delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault()
                  deleteChat(chat.id);
                  navigate('/')
                }}
                title="Удалить чат"
              >
                <CloseIcon width="13" height="13" />
              </button>
            </Link>
          ))}
        </div>

        <div className="sidebar__new-chat">
          <button onClick={handleCreateChat} className="sidebar__new-chat-btn" disabled={isChatLoading}>
            <PlusIcon width="14" height="14" />
            <span>Новый чат</span>
          </button>
        </div>

        {isGuest ? (
          <div className="sidebar__guest">
            <Link to="/login" className="sidebar__guest-btn sidebar__guest-btn--login">
              <LoginIcon width="14" height="14" />
              <span>Войти</span>
            </Link>
            <Link to="/register" className="sidebar__guest-btn sidebar__guest-btn--register">
              <UserIcon width="14" height="14" />
              <span>Зарегистрироваться</span>
            </Link>
          </div>
        ) : (
          <>
            <Link to="/profile" className="sidebar__user">
              <div className="sidebar__user-avatar">{(user && user.email[0])?.toUpperCase() || "A"}</div>
              <div className="sidebar__user-info">
                <span className="sidebar__user-name">{user && user.email}</span>
                <span className="sidebar__user-tokens">
                  {user && parseFloat(String(user.balance)).toFixed(2)} ₽
                </span>
              </div>
            </Link>

            <button
              className="sidebar__logout-btn"
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
