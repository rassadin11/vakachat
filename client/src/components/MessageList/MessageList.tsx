import { useEffect, useRef, useState, useCallback } from 'react';
import type { Message } from '../../types';
import { useChatStore } from '../../store/chatStore';
import MarkdownMessage from '../MarkdownMessage/MarkdownMessage';
import './MessageList.scss';

interface Props {
  messages: Message[];
}

export default function MessageList({ messages }: Props) {
  console.log(messages)
  const isStreaming = useChatStore((s) => s.isStreaming);
  const activeChatId = useChatStore((s) => s.activeChatId);
  const editMessage = useChatStore((s) => s.editMessage);

  const bottomRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isStreaming]);

  // Сбрасываем редактирование при смене чата
  useEffect(() => {
    setEditingId(null);
    setEditValue('');
  }, [activeChatId]);

  const handleStartEdit = useCallback((msg: Message) => {
    setEditingId(msg.id);
    setEditValue(msg.content);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        textareaRef.current.focus();
        // Курсор в конец
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }, 0);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValue('');
  }, []);

  const handleSaveEdit = useCallback(async () => {
    const trimmed = editValue.trim();
    if (!trimmed || !activeChatId || !editingId) return;
    setEditingId(null);
    setEditValue('');
    await editMessage(activeChatId, editingId, trimmed);
  }, [editValue, activeChatId, editingId, editMessage]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  if (messages.length === 0) {
    return (
      <div className="message-list message-list--empty">
        <p>Напиши что-нибудь, чтобы начать диалог</p>
      </div>
    );
  }

  return (
    <div className="message-list">
      <div className="message-list__inner">
        {messages.map((msg, idx) => {
          const isLastAssistant =
            isStreaming && idx === messages.length - 1 && msg.role === 'assistant';
          const isEditing = editingId === msg.id;

          return (
            <div key={msg.id} className={`message message--${msg.role}`}>
              <div className="message__avatar">
                {msg.role === 'user' ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                  </svg>
                )}
              </div>

              <div className="message__body">
                <span className="message__role">
                  {msg.role === 'user' ? 'Вы' : msg.name}
                </span>

                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="message__attachments">
                    {msg.attachments.filter((a) => a.isImage).map((att) => (
                      <img
                        key={att.id}
                        src={att.data}
                        alt={att.name}
                        className="message__attachment-img"
                        title={att.name}
                        onClick={() => window.open(att.data, '_blank')}
                      />
                    ))}
                    {msg.attachments.filter((a) => !a.isImage).map((att) => (
                      <div key={att.id} className="message__attachment-file">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span>{att.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {msg.role === 'user' && isEditing ? (
                  <div className="message__edit">
                    <textarea
                      ref={textareaRef}
                      className="message__edit-textarea"
                      value={editValue}
                      onChange={handleTextareaChange}
                      onKeyDown={handleTextareaKeyDown}
                      rows={1}
                    />
                    <div className="message__edit-actions">
                      <button className="message__edit-cancel" onClick={handleCancelEdit}>
                        Отмена
                      </button>
                      <button
                        className="message__edit-save"
                        onClick={handleSaveEdit}
                        disabled={!editValue.trim()}
                      >
                        Сохранить и отправить
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="message__content">
                    {msg.role === 'assistant' ? (
                      <MarkdownMessage content={msg.content} streamCursor={isLastAssistant} modelId={msg.modelId} />
                    ) : (
                      <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                    )}
                    {msg.role === 'user' && !isStreaming && (
                      <button
                        className="message__edit-btn"
                        onClick={() => handleStartEdit(msg)}
                        title="Редактировать"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
