import { useEffect, useRef, useState, useCallback } from 'react';
import type { Message } from '../../types';
import { useChatStore } from '../../store/chatStore';
import MarkdownMessage from '../MarkdownMessage/MarkdownMessage';
import { ImageLightbox } from './ImageLightbox';
import './MessageList.scss';
import { ChatBubbleIcon, UserIcon, SunIcon, CheckmarkIcon, CloseIcon, FileIcon } from '../../assets/icons';

interface Props {
  messages: Message[];
  onShowMarkdown?: (content: string) => void;
  onRunCode?: (code: string) => void;
}

export default function MessageList({ messages, onShowMarkdown, onRunCode }: Props) {
  const { handleContextMessage, user, isGuest, isStreaming } = useChatStore(s => s)

  const bottomRef = useRef<HTMLDivElement>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    if (messages[messages.length - 1]?.role === 'user') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const openLightbox = useCallback((src: string) => setLightboxSrc(src), []);
  const closeLightbox = useCallback(() => setLightboxSrc(null), []);

  if (messages.length === 0) {
    return (
      <div className="message-list message-list--empty">
        <div className="empty-page__icon-wrap">
          <ChatBubbleIcon className="empty-page__icon" width="40" height="40" strokeWidth="1.2" />
          <div className="empty-page__glow" />
        </div>
        <p>Напиши что-нибудь, чтобы начать диалог</p>
      </div>
    );
  }

  return (
    <>
      <div className="message-list">
        <div className="message-list__inner">
          {messages.map((msg, idx) => {
            const prevMsg = messages[idx - 1];
            const isOutOfContext =
              (msg.role === 'user' && !msg.inContext) ||
              (msg.role === 'assistant' && prevMsg && !prevMsg.inContext);
            const isLastAssistant =
              isStreaming && idx === messages.length - 1 && msg.role === 'assistant';

            return (
              <div key={msg.id} className={`message message--${msg.role} ${isOutOfContext ? 'message--out-of-context' : ''}`}>
                <div className="message__avatar-col">
                  <div className="message__avatar">
                    {msg.role === 'user' ? (
                      <UserIcon width="15" height="15" />
                    ) : (
                      <SunIcon width="15" height="15" />
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <button
                      className={`message__context-btn ${msg.inContext ? 'message__context-btn--active' : 'message__context-btn--inactive'}`}
                      onClick={() => handleContextMessage(msg.id)}
                    >
                      {msg.inContext ? (
                        <CheckmarkIcon width="10" height="10" />
                      ) : (
                        <CloseIcon width="10" height="10" />
                      )}
                      <span className="message__context-tooltip">
                        {msg.inContext ? 'Убрать из контекста' : 'Добавить в контекст'}
                      </span>
                    </button>
                  )}
                </div>

                <div className="message__body">
                  <span className="message__role">
                    {msg.role === 'user' ? (isGuest ? 'Гость' : user?.email.split('@')[0].toLowerCase()) : msg.name || msg.modelName}
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
                          onClick={() => openLightbox(att.data)}
                        />
                      ))}
                      {msg.attachments.filter((a) => !a.isImage).map((att) => (
                        <div key={att.id} className="message__attachment-file">
                          <FileIcon width="13" height="13" />
                          <span>{att.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="message__content">
                    {msg.role === 'assistant' ? (
                      <>
                        {msg.image && (
                          <img
                            src={msg.image}
                            alt="Generated"
                            className="message__generated-img"
                            onClick={() => openLightbox(msg.image!)}
                          />
                        )}
                        <MarkdownMessage content={msg.content} streamCursor={isLastAssistant} modelId={msg.model} onShowMarkdown={onShowMarkdown} onRunCode={onRunCode} />
                      </>
                    ) : (
                      <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={closeLightbox} />}
    </>
  );
}
