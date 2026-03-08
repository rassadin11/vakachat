import { create } from 'zustand';
import type { Chat, Message, User } from '../types';
import { fetchModels as apiFetchModels, streamChat, type StreamOptions } from '../api/openrouter';
import type { Attachment } from '../types';
import { chatApi } from '../api/chats';

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
  user: User | null;
  chats: Chat[];
  activeChat: Chat | null;
  models: any[];
  isLoadingModels: boolean;
  isStreaming: boolean;
  activeModel: { id: string, name: string };
  abortController: AbortController | null;

  setUser: (data: User) => void;
  setChats: (chats: Chat[]) => void;
  createChat: (message: string, systemPrompt: string) => Promise<Chat>;
  deleteChat: (id: string) => void;
  setActiveChat: (id: string) => void;
  setModel: (chatId: string, modelId: string, modelName: string) => void;
  sendMessage: (content: string, options?: StreamOptions, attachments?: Attachment[]) => Promise<void>;
  editMessage: (chatId: string, messageId: string, newContent: string, options?: StreamOptions) => Promise<void>;
  stopStreaming: () => void;
  fetchModels: () => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  user: null,
  chats: [],
  activeChat: null,
  models: [],
  isLoadingModels: false,
  isStreaming: false,
  abortController: null,
  activeModel: { id: DEFAULT_MODEL, name: DEFAULT_MODEL },

  setUser: (user: User) => {
    set(() => ({
      user
    }))
  },

  createChat: async (message, systemPrompt = '') => {
    const newChat = await chatApi.newChat({ title: message, systemPrompt }).then(res => res);

    set((state) => ({
      chats: [{ ...newChat, messages: [] }, ...state.chats],
      activeChat: { ...newChat, messages: [] },
    }));

    return { ...newChat, messages: [] }
  },

  deleteChat: (id) => {
    set((state) => {
      const remaining = state.chats.filter((c) => c.id !== id);
      const newActiveId =
        state.activeChat?.id === id ? (remaining[0]?.id ?? null) : state.activeChat?.id;
      return { chats: remaining, activeChatId: newActiveId };
    });
  },

  setActiveChat: async (id) => {
    const data = await chatApi.getChat(id).then(res => res);
    set({ activeChat: data });
  },

  setChats: (chats: Chat[]) => {
    set(() => ({
      chats,
    }));
  },

  setModel: (modelId, modelName) => {
    set(() => ({
      activeModel: { id: modelId, name: modelName },
    }));
  },

  stopStreaming: () => {
    const { abortController } = get();
    abortController?.abort();
    set({ isStreaming: false, abortController: null });
  },

  sendMessage: async (content, options, attachments) => {
    const { activeChat, isStreaming, activeModel } = get();
    if (isStreaming) return;

    if (!activeChat) {
      const { createChat } = get()
      const data = await createChat(content, options?.systemPrompt ?? '');

      console.log(data)
      // set({ activeChat: data })
    }

    if (activeChat === null) return;

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
      name: activeModel.name,
      modelId: activeModel.id,
      content: '',
      createdAt: new Date(),
    };

    const isFirstMessage = activeChat.messages.length === 0;

    set((state) => ({
      isStreaming: true,
      chats: state.chats.map((c) =>
        c.id === activeChat.id
          ? {
            ...c,
            title: isFirstMessage ? generateTitle(content) : c.title,
            messages: [...c.messages, userMessage, assistantMessage],
          }
          : c,
      ),
    }));

    const modelMeta = get().models.find((m) => m.id === activeModel.id);
    const isImageModel = modelMeta?.architecture?.output_modalities?.includes('image') ?? false;

    const controller = new AbortController();
    set({ abortController: controller });

    await streamChat(
      content,
      activeChat.id,
      activeModel.id,
      (chunk) => {
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === activeChat.id
              ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: m.content + chunk, name: activeModel.name }
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
            c.id === activeChat.id
              ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId && m.content === ''
                    ? { ...m, content: 'Ошибка: не удалось получить ответ.', name: activeModel.name }
                    : m,
                ),
              }
              : c,
          ),
        }));
      },
      { ...options, imageModel: isImageModel },
      controller.signal,
      (imageUrl, content) => {
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === activeChat.id
              ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId ? { ...m, image: imageUrl, content } : m,
                ),
              }
              : c,
          ),
        }));
      },
    );
  },

  editMessage: async (chatId, messageId, newContent) => {
    const { chats, isStreaming, activeModel } = get();
    if (isStreaming) return;

    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;

    const msgIndex = chat.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    const assistantMessageId = generateId();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      name: activeModel.name,
      modelId: activeModel.id,
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

    const modelMeta = get().models.find((m) => m.id === activeModel.id);
    const isImageModel = modelMeta?.architecture?.output_modalities?.includes('image') ?? false;

    const controller = new AbortController();
    set({ abortController: controller });

    // await streamChat(
    //   messagesForApi,
    //   chat.model,
    //   (chunk) => {
    //     set((state) => ({
    //       chats: state.chats.map((c) =>
    //         c.id === chatId
    //           ? {
    //             ...c,
    //             messages: c.messages.map((m) =>
    //               m.id === assistantMessageId
    //                 ? { ...m, content: m.content + chunk }
    //                 : m,
    //             ),
    //           }
    //           : c,
    //       ),
    //     }));
    //   },
    //   () => {
    //     set({ isStreaming: false, abortController: null });
    //   },
    //   (error) => {
    //     console.error('Edit stream error:', error);
    //     set((state) => ({
    //       isStreaming: false,
    //       abortController: null,
    //       chats: state.chats.map((c) =>
    //         c.id === chatId
    //           ? {
    //             ...c,
    //             messages: c.messages.map((m) =>
    //               m.id === assistantMessageId && m.content === ''
    //                 ? { ...m, content: 'Ошибка: не удалось получить ответ.' }
    //                 : m,
    //             ),
    //           }
    //           : c,
    //       ),
    //     }));
    //   },
    //   { ...options, imageModel: isImageModel },
    //   controller.signal,
    //   (imageUrl) => {
    //     set((state) => ({
    //       chats: state.chats.map((c) =>
    //         c.id === chatId
    //           ? {
    //             ...c,
    //             messages: c.messages.map((m) =>
    //               m.id === assistantMessageId ? { ...m, image: imageUrl } : m,
    //             ),
    //           }
    //           : c,
    //       ),
    //     }));
    //   },
    // );
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
