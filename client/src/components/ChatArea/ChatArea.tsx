import { useChatStore } from '../../store/chatStore';
import MessageList from '../MessageList/MessageList';
import MessageInput from '../MessageInput/MessageInput';
import './ChatArea.scss';
import { SidebarToggleIcon, ChatBubbleIcon } from '../../assets/icons';

export default function ChatArea() {
  const { activeChat } = useChatStore(s => s);
  const changeChatTitle = useChatStore(s => s.changeChatTitle);
  const sidebarOpen = useChatStore((s) => s.sidebarOpen);
  const toggleSidebar = useChatStore((s) => s.toggleSidebar);

  const handleTitleChange = (e: React.FocusEvent<HTMLParagraphElement>) => {
    const newTitle = e.currentTarget.textContent?.trim() || 'Новый чат';
    if (activeChat && newTitle !== activeChat.title) {
      changeChatTitle(activeChat.id, newTitle);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLParagraphElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  return (
    <div className="chat-area">
      <div className="chat-area__title">
        {!sidebarOpen && (
          <button className="sidebar-open-btn in-chat" onClick={toggleSidebar}>
            <SidebarToggleIcon width="16" height="16" />
          </button>
        )}
        <div className='name'>
          <p
            contentEditable
            suppressContentEditableWarning
            onBlur={handleTitleChange}
            onKeyDown={handleKeyDown}
          >
            {activeChat?.title}
          </p>
          <span>Нажмите, чтобы изменить название</span>
        </div>
      </div>
      {activeChat ? <MessageList messages={activeChat.messages} /> :
        <div className="app__empty">
          <div className="app__empty-content">
            <ChatBubbleIcon width="48" height="48" strokeWidth="1.5" />
            <p>Напишите и отправьте текст, чтобы создать новый чат</p>
          </div>
        </div>
      }
      <MessageInput />
    </div>
  );
}
