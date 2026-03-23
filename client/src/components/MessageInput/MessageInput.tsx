import { useRef, useState, useCallback } from 'react';
import { useChatStore } from '../../store/chatStore';
import { ProviderLogo } from '../ModelModal/ProviderLogo';
import ModelModal from '../ModelModal/ModelModal';
import './MessageInput.scss';
import { useNavigate } from 'react-router';
import { FORMAT_PROMPT } from '../../utils/system-settings';
import { buildOptions, autoResizeTextarea } from './functions';
import AttachmentList from './AttachmentList';
import ModesList from './ModesList';
import MobileModesDropdown from './MobileModesDropdown';
import Dropdown from '../Dropdown/Dropdown';
import { useAttachments } from './useAttachments';
import { useModes } from './useModes';
import { useTooltip } from './useTooltip';
import { UploadIcon, AttachIcon, ChevronDownIcon, StopIcon, SendIcon } from '../../assets/icons';

const MAX_ROWS = 5;

export default function MessageInput() {
  const [value, setValue] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const navigate = useNavigate();

  const sendMessage = useChatStore((s) => s.sendMessage);
  const createChat = useChatStore((s) => s.createChat);
  const activeChat = useChatStore((s) => s.activeChat);
  const stopStreaming = useChatStore((s) => s.stopStreaming);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const activeModel = useChatStore((s) => s.activeModel);
  const fetchModels = useChatStore((s) => s.fetchModels);
  const models = useChatStore((s) => s.models);
  const isGuest = useChatStore((s) => s.isGuest);
  const trialRequestsLeft = useChatStore((s) => s.trialRequestsLeft);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { attachments, setAttachments, canAttachImages, canAttachFiles, handleFiles, removeAttachment } = useAttachments(activeModel);
  const { activeModes, toggleMode } = useModes();
  const { tooltipRef, showTooltip, hideTooltip } = useTooltip();

  const currentModelId = activeModel?.id;
  const currentModelName = activeModel?.name;

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
    }, 0);
  }, [value, isStreaming, activeChat, sendMessage, createChat, stopStreaming, activeModes, attachments, navigate, setAttachments]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    autoResizeTextarea(e.target, MAX_ROWS);
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
  }, [handleFiles, canAttachImages, canAttachFiles]);

  const canSend = (value.trim().length > 0 || attachments.length > 0) && !isStreaming;
  const sendActive = canSend || isStreaming;

  const handleModalOpen = () => {
    if (models.length === 0) fetchModels();
    setIsModalOpen(true);
  };

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

          <AttachmentList attachments={attachments} onRemove={removeAttachment} />

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
              <ModesList
                variant="desktop"
                activeModes={activeModes}
                onToggle={toggleMode}
                onMouseEnter={showTooltip}
                onMouseLeave={hideTooltip}
              />
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
                  <MobileModesDropdown activeModes={activeModes} onToggle={toggleMode} />
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
