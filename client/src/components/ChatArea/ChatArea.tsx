import { useChatStore } from '../../store/chatStore';
import MessageList from '../MessageList/MessageList';
import MessageInput from '../MessageInput/MessageInput';
import './ChatArea.scss';
import { useParams } from 'react-router';
import { useEffect } from 'react';

export default function ChatArea() {
  const { activeChat, setActiveChat } = useChatStore(s => s);
  const { chatId } = useParams<{ chatId: string }>();

  useEffect(() => {
    if (chatId) {
      setActiveChat(chatId)
    }
  }, [chatId]);

  return (
    <div className="chat-area">
      {activeChat ? <MessageList messages={activeChat.messages} /> :
        <div className="app__empty">
          <div className="app__empty-content">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p>Создай новый чат, чтобы начать</p>
          </div>
        </div>
      }
      <MessageInput />
    </div>
  );
}
