import { useEffect, useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import './Sidebar.scss';
import { chatApi } from '../../api/chats';
import { Link, useNavigate } from 'react-router';
import { authApi } from '../../api/auth';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import { FORMAT_PROMPT } from '../../utils/system-settings';

export default function Sidebar() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false)

  const chats = useChatStore((s) => s.chats);
  const setChats = useChatStore((s) => s.setChats);
  const deleteChat = useChatStore((s) => s.deleteChat);
  const activeChat = useChatStore((s) => s.activeChat);
  const user = useChatStore(s => s.user)
  const sidebarOpen = useChatStore((s) => s.sidebarOpen);
  const toggleSidebar = useChatStore((s) => s.toggleSidebar);

  useEffect(() => {
    const loadChats = async () => {
      await chatApi.getChats().then(res => setChats(res.map(c => ({ ...c, messages: [] }))));
    }

    loadChats()
  }, [])

  const handleCreateChat = async () => {
    setIsLoading(true)

    try {
      await chatApi.newChat({
        title: "Новый чат",
        systemPrompt: FORMAT_PROMPT
      }).then(chat => {
        setChats([...chats, { ...chat, messages: [] }]);
        navigate(`/chats/${chat.id}`);

        if (window.innerWidth < 768) {
          toggleSidebar();
        }
      });

      setIsLoading(false)
    } catch (e) {
      console.error("Failed to create chat:", e);
      setIsLoading(false)
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
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
              <svg className="sidebar__item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
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
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </Link>
          ))}
        </div>

        <div className="sidebar__new-chat">
          <button onClick={handleCreateChat} className="sidebar__new-chat-btn" disabled={isLoading}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Новый чат</span>
          </button>
        </div>

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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Выйти</span>
        </button>
      </div>
    </aside>
  );
}
