import { useChatStore } from '../../store/chatStore';
import MessageList from '../MessageList/MessageList';
import MessageInput from '../MessageInput/MessageInput';
import './ChatArea.scss';

export default function ChatArea() {
  const activeChat = useChatStore((s) => {
    const id = s.activeChatId;
    return s.chats.find((c) => c.id === id);
  });

  if (!activeChat) return null;

  return (
    <div className="chat-area">
      <MessageList messages={activeChat.messages} />
      <MessageInput />
    </div>
  );
}
