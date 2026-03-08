import { useRef, useState, useCallback, useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import type { StreamOptions } from '../../api/openrouter';
import type { Attachment } from '../../types';
import { ProviderLogo } from '../ModelModal/ProviderLogo';
import ModelModal from '../ModelModal/ModelModal';
import './MessageInput.scss';

type ModeId = 'fast' | 'deep' | 'search' | 'critic' | 'tutor';

interface Mode {
  id: ModeId;
  label: string;
  title: string;
  icon: string;
  systemPrompt?: string;
  plugin?: string;
  excludes?: ModeId[];
}

const MODES: Mode[] = [
  {
    id: 'fast',
    label: 'Быстрее',
    title: 'Краткие и точные ответы без лишних деталей',
    icon: '⚡',
    systemPrompt: 'Be concise and direct. Give short, focused answers without unnecessary explanations.',
    excludes: ['deep'],
  },
  {
    id: 'deep',
    label: 'Глубже',
    title: 'Развёрнутый анализ с пошаговым рассуждением',
    icon: '🧠',
    systemPrompt: 'Think deeply and thoroughly. Break down complex topics step by step with detailed analysis and reasoning.',
    excludes: ['fast'],
  },
  {
    id: 'search',
    label: 'Веб-поиск',
    title: 'Поиск актуальной информации в интернете',
    icon: '🌐',
    plugin: 'web',
  },
  {
    id: 'critic',
    label: 'Критик',
    title: 'Найди слабые места и разрушь идею',
    icon: '🔥',
    systemPrompt: 'Act as a ruthless critic and devil\'s advocate. Your job is to find flaws, edge cases, logical gaps, and weak assumptions in any idea or plan. Be direct and harsh. Do not soften feedback. End with what would make the idea actually solid.',
  },
  {
    id: 'tutor',
    label: 'Объясни',
    title: 'Объяснение через примеры и аналогии',
    icon: '🎓',
    systemPrompt: 'You are a patient tutor. Explain concepts using simple analogies and real-world examples. Check understanding by asking clarifying questions. Avoid jargon unless you define it first. Adapt complexity to what the user seems to know.',
  },
];

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'js', 'ts', 'tsx', 'jsx', 'py', 'json', 'csv',
  'xml', 'html', 'css', 'scss', 'yaml', 'yml', 'sh', 'sql',
  'c', 'cpp', 'h', 'java', 'rs', 'go', 'rb', 'php', 'swift',
]);

function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp'].includes(ext);
}

function isTextFile(file: File): boolean {
  if (file.type.startsWith('text/')) return true;
  if (['application/json', 'application/xml'].includes(file.type)) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return TEXT_EXTENSIONS.has(ext);
}

async function processFile(file: File, allowImages: boolean): Promise<Attachment | null> {
  const asImage = isImageFile(file);
  if (asImage && !allowImages) return null;
  const asText = !asImage && isTextFile(file);
  if (!asImage && !asText) return null;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        name: file.name,
        mimeType: file.type || (asImage ? 'image/jpeg' : 'text/plain'),
        data: e.target!.result as string,
        isImage: asImage,
        size: file.size,
      });
    };
    reader.onerror = () => resolve(null);
    if (asImage) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  });
}

const FORMAT_PROMPT = `
Format rules (always follow):
- Math formulas: inline with $formula$, block with $$formula$$
- Code: always use fenced blocks with language tag
- Lists: markdown only, no unicode bullets
- No HTML tags in output
- Paragraphs: separated by blank line
`

function buildOptions(activeModes: Set<ModeId>): StreamOptions | undefined {
  const prompts: string[] = [];
  const plugins: string[] = [];
  for (const mode of MODES) {
    if (!activeModes.has(mode.id)) continue;
    if (mode.systemPrompt) prompts.push(mode.systemPrompt);
    if (mode.plugin) plugins.push(mode.plugin);
  }
  if (prompts.length === 0 && plugins.length === 0) return undefined;
  prompts.unshift(FORMAT_PROMPT);
  return {
    ...(prompts.length > 0 ? { systemPrompt: prompts.join(' ') } : {}),
    ...(plugins.length > 0 ? { plugins } : {}),
  };
}

const MAX_ROWS = 5;

export default function MessageInput() {
  const [value, setValue] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModes, setActiveModes] = useState<Set<ModeId>>(new Set());
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const sendMessage = useChatStore((s) => s.sendMessage);
  const stopStreaming = useChatStore((s) => s.stopStreaming);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const models = useChatStore((s) => s.models);
  const activeChat = useChatStore((s) => s.chats.find((c) => c.id === s.activeChat?.id));

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentModelId = activeChat?.messages[activeChat?.messages.length - 1]?.modelId ?? '';
  const currentModel = models.find((m) => m.id === currentModelId);
  const currentModelName = currentModel?.name ?? currentModelId;
  const canAttachImages = currentModel?.architecture?.input_modalities?.includes('image') ?? false;

  // Удаляем прикреплённые картинки, если сменили модель без поддержки vision
  useEffect(() => {
    if (!canAttachImages) {
      setAttachments((prev) => prev.filter((a) => !a.isImage));
    }
  }, [canAttachImages]);

  const handleFiles = useCallback(async (files: File[], allowImages: boolean) => {
    const results = await Promise.all(files.map((f) => processFile(f, allowImages)));
    const valid = results.filter(Boolean) as Attachment[];
    if (valid.length > 0) setAttachments((prev) => [...prev, ...valid]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const toggleMode = (mode: Mode) => {
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
    await sendMessage(trimmed, buildOptions(activeModes), attachments);
  }, [value, isStreaming, sendMessage, stopStreaming, activeModes, attachments]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = 'fit-content'

    const { lineHeight, paddingTop, paddingBottom } = getComputedStyle(el);
    const maxHeight = MAX_ROWS * parseFloat(lineHeight) + parseFloat(paddingTop) + parseFloat(paddingBottom);

    const scrollH = el.scrollHeight;
    el.style.maxHeight = maxHeight + 'px';
    el.style.overflowY = scrollH > maxHeight ? 'auto' : 'hidden';
  };

  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!canAttachImages) return;
    const imageItems = Array.from(e.clipboardData.items).filter(
      (item) => item.kind === 'file' && item.type.startsWith('image/'),
    );
    if (imageItems.length === 0) return;
    e.preventDefault();
    const files = imageItems.map((item) => item.getAsFile()).filter(Boolean) as File[];
    await handleFiles(files, true);
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
    await handleFiles(Array.from(e.dataTransfer.files), canAttachImages);
  }, [handleFiles, canAttachImages]);

  const canSend = (value.trim().length > 0 || attachments.length > 0) && !isStreaming;
  const sendActive = canSend || isStreaming;

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
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
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
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span title={att.name}>{att.name}</span>
                    </div>
                  )}
                  <button
                    className="message-input__attachment-remove"
                    onClick={() => removeAttachment(att.id)}
                    title="Удалить"
                  >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
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
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={isStreaming}
          />

          <div className="message-input__modes">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                className={`message-input__mode-btn ${activeModes.has(mode.id) ? 'message-input__mode-btn--active' : ''}`}
                onClick={() => toggleMode(mode)}
                title={mode.title}
                type="button"
              >
                <span className="message-input__mode-icon">{mode.icon}</span>
                {mode.label}
              </button>
            ))}
          </div>

          <div className="message-input__bottom">
            <div className="message-input__bottom-left">
              <button
                className="message-input__attach-btn"
                onClick={() => fileInputRef.current?.click()}
                title={canAttachImages ? 'Прикрепить файл или изображение' : 'Прикрепить файл (модель не поддерживает изображения)'}
                type="button"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <button
                className="message-input__model-btn"
                onClick={() => setIsModalOpen(true)}
                title="Выбрать модель"
              >
                <ProviderLogo modelId={currentModelId} size={18} />
                <span className="message-input__model-name">{currentModelName}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>

            <button
              className={`message-input__send ${sendActive ? 'message-input__send--active' : ''} ${isStreaming ? 'message-input__send--stop' : ''}`}
              onClick={handleSend}
              disabled={!sendActive}
              title={isStreaming ? 'Остановить' : 'Отправить'}
            >
              {isStreaming ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <p className="message-input__hint">
          vakachat — выбирайте модель и пользуйтесь всеми её возможностями
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={
          (canAttachImages ? 'image/*,' : '') +
          '.txt,.md,.js,.ts,.tsx,.jsx,.py,.json,.csv,.xml,.html,.css,.scss,.yaml,.yml,.sh,.sql,.c,.cpp,.h,.java,.rs,.go,.rb,.php,.swift'
        }
        style={{ display: 'none' }}
        onChange={async (e) => {
          await handleFiles(Array.from(e.target.files ?? []), canAttachImages);
          e.target.value = '';
        }}
      />

      {isModalOpen && <ModelModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
}
