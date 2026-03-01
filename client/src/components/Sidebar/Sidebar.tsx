import { useChatStore } from '../../store/chatStore';
import './Sidebar.scss';

export default function Sidebar() {
  const chats = useChatStore((s) => s.chats);
  const activeChatId = useChatStore((s) => s.activeChatId);
  const createChat = useChatStore((s) => s.createChat);
  const deleteChat = useChatStore((s) => s.deleteChat);
  const setActiveChat = useChatStore((s) => s.setActiveChat);

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <span className="sidebar__logo">VakaChat</span>
        <button className="sidebar__new-btn" onClick={createChat} title="Новый чат">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <div className="sidebar__chats">
        {chats.length === 0 && (
          <p className="sidebar__empty-hint">Нет чатов. Создай первый!</p>
        )}
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`sidebar__item ${activeChatId === chat.id ? 'sidebar__item--active' : ''}`}
            onClick={() => setActiveChat(chat.id)}
          >
            <svg className="sidebar__item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="sidebar__item-title">{chat.title}</span>
            <button
              className="sidebar__delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                deleteChat(chat.id);
              }}
              title="Удалить чат"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="sidebar__user">
        <div className="sidebar__user-avatar">А</div>
        <div className="sidebar__user-info">
          <span className="sidebar__user-name">Пользователь</span>
          <span className="sidebar__user-tokens">100 000 токенов</span>
        </div>
      </div>
    </aside>
  );
}
