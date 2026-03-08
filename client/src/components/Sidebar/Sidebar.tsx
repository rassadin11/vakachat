import { useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import './Sidebar.scss';
import { chatApi } from '../../api/chats';

export default function Sidebar() {
  const chats = useChatStore((s) => s.chats);
  const setChats = useChatStore((s) => s.setChats);
  const deleteChat = useChatStore((s) => s.deleteChat);
  const setActiveChat = useChatStore((s) => s.setActiveChat);
  const user = useChatStore(s => s.user)

  useEffect(() => {
    const loadChats = async () => {
      await chatApi.getChats().then(res => setChats(res.map(c => ({ ...c, messages: [] }))));
    }

    loadChats()
  }, [])

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <span className="sidebar__logo">vakachat</span>
      </div>

      <div className="sidebar__chats">
        {chats.length === 0 && (
          <p className="sidebar__empty-hint">Нет чатов. Создай первый!</p>
        )}
        {chats.map((chat) => (
          <a
            href={`/chats/${chat.id}`}
            key={chat.id}
            className={`sidebar__item ${'3' === chat.id ? 'sidebar__item--active' : ''}`}
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
          </a>
        ))}
      </div>

      <div className="sidebar__user">
        <div className="sidebar__user-avatar">А</div>
        <div className="sidebar__user-info">
          <span className="sidebar__user-name">{user && user.email}</span>
          <span className="sidebar__user-tokens">{user && parseInt(user.balance).toFixed(2)} ₽</span>
          <button className="sidebar__user-tokens">Выйти</button>
        </div>
      </div>
    </aside>
  );
}
