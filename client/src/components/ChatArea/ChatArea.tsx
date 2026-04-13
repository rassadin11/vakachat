import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import MessageList from '../MessageList/MessageList';
import MessageInput from '../MessageInput/MessageInput';
import MarkdownPreviewPanel from '../MarkdownPreviewPanel/MarkdownPreviewPanel';
import { CodeRunner } from '../MarkdownMessage/CodeRunner';
import './ChatArea.scss';
import { SidebarToggleIcon, ChatBubbleIcon, CloseIcon } from '../../assets/icons';

function extractMarkdownContent(text: string): string | null {
  const match = text.match(/```markdown\n([\s\S]*)\n```(?:\n|$)/);
  return match ? match[1].trim() : null;
}

export default function ChatArea() {
  const { activeChat } = useChatStore(s => s);
  const changeChatTitle = useChatStore(s => s.changeChatTitle);
  const sidebarOpen = useChatStore((s) => s.sidebarOpen);
  const toggleSidebar = useChatStore((s) => s.toggleSidebar);

  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [panelDismissed, setPanelDismissed] = useState(false);
  const lastAssistantIdRef = useRef<string | null>(null);
  const activeChatIdRef = useRef<string | null>(null);
  const [runnerCode, setRunnerCode] = useState<string | null>(null);
  const [runnerKey, setRunnerKey] = useState(0);

  useEffect(() => {
    if (!activeChat) {
      setPreviewContent(null);
      return;
    }
    const lastAssistant = [...activeChat.messages].reverse().find(m => m.role === 'assistant');
    if (!lastAssistant) {
      setPreviewContent(null);
      return;
    }

    const chatChanged = activeChat.id !== activeChatIdRef.current;
    const messageChanged = lastAssistant.id !== lastAssistantIdRef.current;

    if (chatChanged) {
      // Пользователь переключился на другой чат — не открывать панель автоматически
      activeChatIdRef.current = activeChat.id;
      lastAssistantIdRef.current = lastAssistant.id;
      setPanelDismissed(true);
      setPreviewContent(null);
      return;
    }

    if (messageChanged) {
      // Новое сообщение в том же чате — разрешить автооткрытие
      lastAssistantIdRef.current = lastAssistant.id;
      setPanelDismissed(false);
    }

    const extracted = extractMarkdownContent(lastAssistant.content);
    if (!panelDismissed && extracted) {
      setPreviewContent(extracted);
    } else if (!extracted) {
      setPreviewContent(null);
    }
  }, [activeChat?.messages, panelDismissed]);

  const handleClosePreview = () => {
    setPanelDismissed(true);
    setPreviewContent(null);
  };

  const handleRunCode = (code: string) => {
    setRunnerCode(code);
    setRunnerKey(k => k + 1);
    setPreviewContent(null);
    setPanelDismissed(true);
  };

  const handleCloseRunner = () => setRunnerCode(null);

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
      <div className="chat-area__chat">
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
        {activeChat ? <MessageList messages={activeChat.messages} onShowMarkdown={setPreviewContent} onRunCode={handleRunCode} /> :
          <div className="app__empty">
            <div className="app__empty-content">
              <ChatBubbleIcon width="48" height="48" strokeWidth="1.5" />
              <p>Напишите и отправьте текст, чтобы создать новый чат</p>
            </div>
          </div>
        }
        <MessageInput />
      </div>

      {runnerCode ? (
        <div className="chat-area__preview chat-area__preview--runner">
          <div className="chat-area__runner">
            <div className="chat-area__runner-header">
              <span>Вывод Python</span>
              <button onClick={handleCloseRunner} title="Закрыть">
                <CloseIcon width="15" height="15" />
              </button>
            </div>
            <CodeRunner key={runnerKey} code={runnerCode} />
          </div>
        </div>
      ) : previewContent ? (
        <div className="chat-area__preview chat-area__preview--runner">
          <MarkdownPreviewPanel content={previewContent} onClose={handleClosePreview} />
        </div>
      ) : null}
    </div>
  );
}
