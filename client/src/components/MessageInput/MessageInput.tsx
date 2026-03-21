import { useRef, useState, useCallback, useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import type { Attachment } from '../../types';
import { ProviderLogo } from '../ModelModal/ProviderLogo';
import ModelModal from '../ModelModal/ModelModal';
import './MessageInput.scss';
import { useNavigate } from 'react-router';
import { FORMAT_PROMPT } from '../../utils/system-settings';
import { Mode, ModeId, MODES } from '../../utils/modes';
import { buildOptions, processFile } from './functions';
import Dropdown from '../Dropdown/Dropdown';
import { UploadIcon, FileTextIcon, FileIcon, CloseIcon, AttachIcon, ChevronDownIcon, CheckmarkIcon, EditIcon, StopIcon, SendIcon } from '../../assets/icons';

const MAX_ROWS = 5;

export default function MessageInput() {
  const [value, setValue] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModes, setActiveModes] = useState<Set<ModeId>>(new Set());
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [canAttachImages, setCanAttachImages] = useState(false);
  const [canAttachFiles, setCanAttachFiles] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [modesOpen, setModesOpen] = useState(false);
  const modesDropdownRef = useRef<HTMLDivElement>(null);
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const navigate = useNavigate();

  const sendMessage = useChatStore((s) => s.sendMessage);
  const createChat = useChatStore(s => s.createChat)
  const activeChat = useChatStore((s) => s.activeChat);
  const stopStreaming = useChatStore((s) => s.stopStreaming);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const activeModel = useChatStore(s => s.activeModel)
  const setModel = useChatStore((s) => s.setModel);
  const resetModel = useChatStore(s => s.resetModel);
  const fetchModels = useChatStore((s) => s.fetchModels);
  const { isResearch, setIsResearch } = useChatStore(s => s)
  const models = useChatStore((s) => s.models);
  const isGuest = useChatStore((s) => s.isGuest);
  const trialRequestsLeft = useChatStore((s) => s.trialRequestsLeft);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentModelId = activeModel?.id;
  const currentModelName = activeModel?.name;

  useEffect(() => {
    if (!modesOpen) return;
    function handleClick(e: MouseEvent) {
      if (!modesDropdownRef.current?.contains(e.target as Node)) {
        setModesOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [modesOpen]);

  useEffect(() => {
    const modalities = activeModel?.architecture.input_modalities;
    setCanAttachImages(modalities?.includes('image'));
    setCanAttachFiles(modalities?.includes('file'));
  }, [activeModel]);

  useEffect(() => {
    if (!canAttachFiles) {
      setAttachments((prev) => prev.filter((a) => a.isImage || !a.isDocument));
    }
  }, [canAttachFiles]);

  const handleFiles = useCallback(async (files: File[], allowImages: boolean, allowDocuments: boolean) => {
    const results = await Promise.all(files.map((f) => processFile(f, allowImages, allowDocuments)));
    const valid = results.filter(Boolean) as Attachment[];
    if (valid.length > 0) setAttachments((prev) => [...prev, ...valid]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const toggleMode = (mode: Mode) => {
    if (mode.forceModel) {
      setModel(mode.forceModel)
      setIsResearch(true)
    }

    if (isResearch && mode.forceModel) {
      resetModel();
      setIsResearch(false)
    }

    setActiveModes((prev) => {
      const next = new Set(prev);
      if (next.has(mode.id)) {
        next.delete(mode.id);
      } else {
        mode.excludes?.forEach((ex) => next.delete(ex));
        next.add(mode.id);
      }
      return next;
    });
  };

  const handleSend = useCallback(async () => {
    if (isStreaming) { stopStreaming(); return; }
    const trimmed = value.trim();
    if (!trimmed && attachments.length === 0) return;

    setValue('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.overflowY = 'hidden';
    }

    const options = buildOptions(activeModes);

    let chatId = activeChat?.id;

    if (!chatId) {
      const newChat = await createChat(trimmed, FORMAT_PROMPT);
      if (!newChat) return;
      chatId = newChat.id;
      navigate(`/chats/${chatId}`);
    }

    setTimeout(async () => {
      await sendMessage(trimmed, options, attachments);
    }, 0)
  }, [value, isStreaming, activeChat, sendMessage, createChat, stopStreaming, activeModes, attachments, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;

    el.style.height = '0';  // ← именно 0, не auto

    if (!el.dataset.lineH) {
      const v = el.value;
      el.value = 'x';
      const h1 = el.scrollHeight;
      el.value = 'x\nx';
      const h2 = el.scrollHeight;
      el.value = v;
      el.dataset.lineH = String(h2 - h1);
      el.dataset.baseH = String(h1);
    }

    const lineH = Number(el.dataset.lineH);
    const baseH = Number(el.dataset.baseH);
    const maxH = baseH + lineH * (MAX_ROWS - 1);

    const scrollH = el.scrollHeight;

    if (scrollH > maxH) {
      el.style.height = `${maxH}px`;
      el.style.overflowY = 'auto';
    } else {
      el.style.height = `${scrollH}px`;
      el.style.overflowY = 'hidden';
    }
  };

  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!canAttachImages) return;
    const imageItems = Array.from(e.clipboardData.items).filter(
      (item) => item.kind === 'file' && item.type.startsWith('image/'),
    );
    if (imageItems.length === 0) return;
    e.preventDefault();
    const files = imageItems.map((item) => item.getAsFile()).filter(Boolean) as File[];
    await handleFiles(files, true, false);
  }, [handleFiles, canAttachImages]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    await handleFiles(Array.from(e.dataTransfer.files), canAttachImages, canAttachFiles);
  }, [handleFiles, canAttachImages]);

  const canSend = (value.trim().length > 0 || attachments.length > 0) && !isStreaming;
  const sendActive = canSend || isStreaming;

  const handleModalOpen = () => {
    if (models.length === 0) {
      fetchModels();
    }

    setIsModalOpen(true)
  }

  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showTooltip(e: React.MouseEvent<HTMLButtonElement>, text: string) {
    const tooltip = tooltipRef.current;
    if (!tooltip) return;

    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);

    tooltip.textContent = text;
    tooltip.style.opacity = '1';

    const btnRect = e.currentTarget.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = 8;

    let left = btnRect.left + btnRect.width / 2 - tooltipRect.width / 2;
    if (left < padding) left = padding;
    if (left + tooltipRect.width > window.innerWidth - padding) {
      left = window.innerWidth - tooltipRect.width - padding;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${btnRect.top - tooltipRect.height - 10}px`;

    // На мобиле скрываем через 3 секунды
    if (window.matchMedia('(max-width: 768px)').matches) {
      tooltipTimerRef.current = setTimeout(() => {
        if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
      }, 3000);
    }
  }

  function hideTooltip() {
    if (window.matchMedia('(max-width: 768px)').matches) return;
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
  }

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  return (
    <>
      <div className="message-input">
        <div
          className={`message-input__wrapper ${isDragging ? 'message-input__wrapper--dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="message-input__drop-overlay">
              <UploadIcon width="28" height="28" />
              Отпустите для загрузки
            </div>
          )}

          {attachments.length > 0 && (
            <div className="message-input__attachments">
              {attachments.map((att) => (
                <div key={att.id} className="message-input__attachment">
                  {att.isImage ? (
                    <img src={att.data} alt={att.name} className="message-input__attachment-img" />
                  ) : (
                    <div className="message-input__attachment-file">
                      {att.isDocument ? (
                        <FileTextIcon width="14" height="14" />
                      ) : (
                        <FileIcon width="14" height="14" />
                      )}
                      <span title={att.name}>{att.name}</span>
                    </div>
                  )}
                  <button
                    className="message-input__attachment-remove"
                    onClick={() => removeAttachment(att.id)}
                    title="Удалить"
                  >
                    <CloseIcon width="8" height="8" strokeWidth="3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            className="message-input__textarea"
            placeholder="Сообщение... (Enter — отправить, Shift+Enter — новая строка)"
            value={value}
            rows={1}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={isStreaming}
          />

          {!isMobile && (
            <div className="message-input__modes">
              {MODES.map((mode) => (
                <button
                  key={mode.id}
                  className={`message-input__mode-btn ${activeModes.has(mode.id) ? 'message-input__mode-btn--active' : ''}`}
                  onClick={() => toggleMode(mode)}
                  onMouseEnter={(e) => showTooltip(e, mode.title)}
                  onMouseLeave={hideTooltip}
                  type="button"
                >
                  <span className="message-input__mode-icon">{mode.icon}</span>
                  {mode.label}
                </button>
              ))}
            </div>
          )}

          <div className="message-input__bottom">
            <div className="message-input__bottom-left">

              <div className="message-input__bottom-row">
                <button
                  className="message-input__attach-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title={
                    canAttachImages && canAttachFiles
                      ? 'Прикрепить файл, изображение или документ'
                      : canAttachImages
                        ? 'Прикрепить файл или изображение'
                        : canAttachFiles
                          ? 'Прикрепить файл или документ'
                          : 'Прикрепить файл'
                  }
                  type="button"
                >
                  <AttachIcon width="15" height="15" />
                </button>
                <button
                  className="message-input__model-btn"
                  onClick={handleModalOpen}
                  title="Выбрать модель"
                >
                  <ProviderLogo modelId={currentModelId} size={18} />
                  <span className="message-input__model-name">{currentModelName}</span>
                  <ChevronDownIcon width="12" height="12" />
                </button>
              </div>
              <div className="message-input__bottom-row">

                {isMobile && (
                  <div className="message-input__modes-dropdown" ref={modesDropdownRef}>
                    <button
                      type="button"
                      className={`message-input__modes-trigger ${activeModes.size > 0 ? 'message-input__modes-trigger--active' : ''}`}
                      onClick={() => setModesOpen(v => !v)}
                    >
                      <EditIcon width="14" height="14" />
                      Режимы
                      {activeModes.size > 0 && (
                        <span className="message-input__modes-count">{activeModes.size}</span>
                      )}
                    </button>

                    {modesOpen && (
                      <div className="message-input__modes-menu">
                        {MODES.map((mode) => {
                          const isActive = activeModes.has(mode.id);
                          return (
                            <button
                              key={mode.id}
                              type="button"
                              className={`message-input__modes-option ${isActive ? 'message-input__modes-option--active' : ''}`}
                              onClick={() => toggleMode(mode)}
                            >
                              <span className="message-input__mode-icon">{mode.icon}</span>
                              <span className="message-input__modes-option-label">{mode.label}</span>
                              {isActive && (
                                <CheckmarkIcon className="message-input__modes-check" width="13" height="13" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <Dropdown />
              </div>

            </div>

            <button
              className={`message-input__send ${sendActive ? 'message-input__send--active' : ''} ${isStreaming ? 'message-input__send--stop' : ''}`}
              onClick={handleSend}
              disabled={!sendActive && !isStreaming}
              title={isStreaming ? 'Остановить' : 'Отправить'}
            >
              {isStreaming ? (
                <StopIcon width="14" height="14" />
              ) : (
                <SendIcon width="15" height="15" />
              )}
            </button>
          </div>

          <div ref={tooltipRef} className="message-input__global-tooltip" />
        </div>

        {isGuest ? (
          <p className="message-input__hint message-input__hint--trial">
            Пробный режим · осталось <strong>{trialRequestsLeft} из 5</strong> запросов ·{' '}
            <a href="/register">Зарегистрироваться</a>
          </p>
        ) : (
          <p className="message-input__hint">
            vakachat — выбирай модель и пользуйся всеми её возможностями
          </p>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={
          (canAttachImages ? 'image/*,' : '') +
          (canAttachFiles ? '.docx,' : '') +
          '.txt,.md,.js,.ts,.tsx,.jsx,.py,.json,.csv,.xml,.html,.css,.scss,.yaml,.yml,.sh,.sql,.c,.cpp,.h,.java,.rs,.go,.rb,.php,.swift,.pdf'
        }
        style={{ display: 'none' }}
        onChange={async (e) => {
          await handleFiles(Array.from(e.target.files ?? []), canAttachImages, canAttachFiles);
          e.target.value = '';
        }}
      />

      {isModalOpen && <ModelModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
}
