import { create } from 'zustand';
import type { Chat, Message, OpenRouterModel } from '../types';
import { fetchModels as apiFetchModels, streamChat, buildApiContent, type StreamOptions } from '../api/openrouter';
import type { Attachment } from '../types';

const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-5';

const ALLOWED_PREFIXES = [
  'anthropic/',
  'google/',
  'openai/',
  'deepseek/',
  'z-ai/',       // GLM (ZhipuAI)
  'moonshotai/',  // Kimi
];

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function generateTitle(content: string): string {
  const words = content.trim().split(/\s+/);
  const slice = words.slice(0, 5).join(' ');
  return words.length > 5 ? slice + '...' : slice;
}

interface ChatStore {
  chats: Chat[];
  activeChatId: string | null;
  models: OpenRouterModel[];
  isLoadingModels: boolean;
  isStreaming: boolean;
  abortController: AbortController | null;

  createChat: () => void;
  deleteChat: (id: string) => void;
  setActiveChat: (id: string) => void;
  setModel: (chatId: string, modelId: string, modelName: string) => void;
  sendMessage: (content: string, options?: StreamOptions, attachments?: Attachment[]) => Promise<void>;
  editMessage: (chatId: string, messageId: string, newContent: string, options?: StreamOptions) => Promise<void>;
  stopStreaming: () => void;
  fetchModels: () => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: [],
  activeChatId: null,
  models: [],
  isLoadingModels: false,
  isStreaming: false,
  abortController: null,

  createChat: () => {
    const { models } = get();
    const preferred = models.find((m) => m.id === DEFAULT_MODEL);
    const topLlm = models.find((m) => {
      const out = m.architecture?.output_modalities;
      return !out || out.every((mod) => mod === 'text');
    });
    const defaultModel = preferred ?? topLlm ?? models[0];
    const newChat: Chat = {
      id: generateId(),
      title: 'Новый чат',
      model: defaultModel?.id ?? DEFAULT_MODEL,
      modelName: defaultModel?.name ?? DEFAULT_MODEL,
      messages: [],
      createdAt: new Date(),
    };
    set((state) => ({
      chats: [newChat, ...state.chats],
      activeChatId: newChat.id,
    }));
  },

  deleteChat: (id) => {
    set((state) => {
      const remaining = state.chats.filter((c) => c.id !== id);
      const newActiveId =
        state.activeChatId === id ? (remaining[0]?.id ?? null) : state.activeChatId;
      return { chats: remaining, activeChatId: newActiveId };
    });
  },

  setActiveChat: (id) => {
    set({ activeChatId: id });
  },

  setModel: (chatId, modelId, modelName) => {
    set((state) => ({
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, model: modelId, modelName } : c)),
    }));
  },

  stopStreaming: () => {
    const { abortController } = get();
    abortController?.abort();
    set({ isStreaming: false, abortController: null });
  },

  sendMessage: async (content, options, attachments) => {
    const { activeChatId, chats, isStreaming } = get();
    if (!activeChatId || isStreaming) return;

    const activeChat = chats.find((c) => c.id === activeChatId);
    if (!activeChat) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      name: 'Пользователь',
      content,
      attachments: attachments?.length ? attachments : undefined,
      createdAt: new Date(),
    };

    const assistantMessageId = generateId();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      name: activeChat.modelName,
      modelId: activeChat.model,
      content: '',
      createdAt: new Date(),
    };

    const isFirstMessage = activeChat.messages.length === 0;

    set((state) => ({
      isStreaming: true,
      chats: state.chats.map((c) =>
        c.id === activeChatId
          ? {
            ...c,
            title: isFirstMessage ? generateTitle(content) : c.title,
            messages: [...c.messages, userMessage, assistantMessage],
          }
          : c,
      ),
    }));

    const messagesForApi = [
      ...activeChat.messages.map((m) => ({ role: m.role, content: buildApiContent(m.content, m.attachments) })),
      { role: 'user', content: buildApiContent(content, attachments) },
    ];

    const modelMeta = get().models.find((m) => m.id === activeChat.model);
    const isImageModel = modelMeta?.architecture?.output_modalities?.includes('image') ?? false;

    const controller = new AbortController();
    set({ abortController: controller });

    await streamChat(
      messagesForApi,
      activeChat.model,
      (chunk) => {
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === activeChatId
              ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: m.content + chunk, name: activeChat.modelName }
                    : m,
                ),
              }
              : c,
          ),
        }));
      },
      () => {
        set({ isStreaming: false, abortController: null });
      },
      (error) => {
        console.error('Stream error:', error);
        set((state) => ({
          isStreaming: false,
          abortController: null,
          chats: state.chats.map((c) =>
            c.id === activeChatId
              ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId && m.content === ''
                    ? { ...m, content: 'Ошибка: не удалось получить ответ.', name: activeChat.modelName }
                    : m,
                ),
              }
              : c,
          ),
        }));
      },
      { ...options, imageModel: isImageModel },
      controller.signal,
    );
  },

  editMessage: async (chatId, messageId, newContent) => {
    const { chats, isStreaming } = get();
    if (isStreaming) return;

    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;

    const msgIndex = chat.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    const assistantMessageId = generateId();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      name: chat.modelName,
      modelId: chat.model,
      content: '',
      createdAt: new Date(),
    };

    // Оставляем сообщения до редактируемого (включительно, с новым текстом) + пустой ответ ассистента
    const updatedMessages: Message[] = [
      ...chat.messages.slice(0, msgIndex),
      { ...chat.messages[msgIndex], content: newContent },
      assistantMessage,
    ];

    set((state) => ({
      isStreaming: true,
      chats: state.chats.map((c) =>
        c.id === chatId ? { ...c, messages: updatedMessages } : c,
      ),
    }));

    const messagesForApi = updatedMessages
      .slice(0, -1)
      .map((m) => ({ role: m.role, content: buildApiContent(m.content, m.attachments) }));

    const modelMeta = get().models.find((m) => m.id === chat.model);
    const isImageModel = modelMeta?.architecture?.output_modalities?.includes('image') ?? false;

    const controller = new AbortController();
    set({ abortController: controller });

    await streamChat(
      messagesForApi,
      chat.model,
      (chunk) => {
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chatId
              ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: m.content + chunk }
                    : m,
                ),
              }
              : c,
          ),
        }));
      },
      () => {
        set({ isStreaming: false, abortController: null });
      },
      (error) => {
        console.error('Edit stream error:', error);
        set((state) => ({
          isStreaming: false,
          abortController: null,
          chats: state.chats.map((c) =>
            c.id === chatId
              ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId && m.content === ''
                    ? { ...m, content: 'Ошибка: не удалось получить ответ.' }
                    : m,
                ),
              }
              : c,
          ),
        }));
      },
      { ...options, imageModel: isImageModel },
      controller.signal,
    );
  },

  fetchModels: async () => {
    set({ isLoadingModels: true });
    try {
      const all = await apiFetchModels();
      // Оставляем порядок API как есть — он отражает популярность на OpenRouter
      const models = all.filter((m) => ALLOWED_PREFIXES.some((p) => m.id.startsWith(p)));
      set({ models, isLoadingModels: false });
    } catch (error) {
      console.error('Failed to fetch models:', error);
      set({ isLoadingModels: false });
    }
  },
}));
