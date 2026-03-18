import { useEffect, useRef, useState, useCallback } from 'react';
import type { Message } from '../../types';
import { useChatStore } from '../../store/chatStore';
import MarkdownMessage from '../MarkdownMessage/MarkdownMessage';
import './MessageList.scss';

interface Props {
  messages: Message[];
}

export default function MessageList({ messages }: Props) {
  const isStreaming = useChatStore((s) => s.isStreaming);
  const { handleContextMessage } = useChatStore(s => s)
  const user = useChatStore((s) => s.user);
  const isGuest = useChatStore((s) => s.isGuest);

  const bottomRef = useRef<HTMLDivElement>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isStreaming]);

  useEffect(() => {
    if (!lightboxSrc) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxSrc(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxSrc]);

  const openLightbox = useCallback((src: string) => setLightboxSrc(src), []);
  const closeLightbox = useCallback(() => setLightboxSrc(null), []);

  if (messages.length === 0) {
    return (
      <div className="message-list message-list--empty">
        <div className="empty-page__icon-wrap">
          <svg className="empty-page__icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
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

                  {msg.role === 'user' && (
                    <button
                      className={`message__context-btn ${msg.inContext ? 'message__context-btn--active' : 'message__context-btn--inactive'}`}
                      onClick={() => handleContextMessage(msg.id)}
                    >
                      {msg.inContext ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
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
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
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
                        <MarkdownMessage content={msg.content} streamCursor={isLastAssistant} modelId={msg.model} />
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

      {lightboxSrc && (
        <div className="lightbox" onClick={closeLightbox}>
          <button className="lightbox__close" onClick={closeLightbox} title="Закрыть">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <a
            className="lightbox__download"
            href={lightboxSrc}
            download
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Скачать"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </a>
          <img
            src={lightboxSrc}
            alt="Fullscreen"
            className="lightbox__img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
