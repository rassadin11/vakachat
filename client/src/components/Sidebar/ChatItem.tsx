import { Link, useNavigate } from 'react-router';
import { useChatStore } from '../../store/chatStore';
import { ChatBubbleIcon, CloseIcon } from '../../assets/icons';
import { Chat } from '../../types';
import styles from './Sidebar.module.scss';

interface ChatItemProps {
  chat: Chat;
}

export default function ChatItem({ chat }: ChatItemProps) {
  const navigate = useNavigate();

  const activeChat = useChatStore((s) => s.activeChat);
  const deleteChat = useChatStore((s) => s.deleteChat);
  const toggleSidebar = useChatStore((s) => s.toggleSidebar);

  const handleChatClick = () => {
    if (window.innerWidth < 768) toggleSidebar();
  };

  return (
    <Link
      to={`/chats/${chat.id}`}
      className={`${styles['sidebar__item']} ${activeChat?.id === chat.id ? styles['sidebar__item--active'] : ''}`}
      onClick={handleChatClick}
    >
      <ChatBubbleIcon className={styles['sidebar__item-icon']} width="14" height="14" />
      <span className={styles['sidebar__item-title']}>{chat.title}</span>
      <button
        className={styles['sidebar__delete-btn']}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          deleteChat(chat.id);
          navigate('/');
        }}
        title="Удалить чат"
      >
        <CloseIcon width="13" height="13" />
      </button>
    </Link>
  );
}
