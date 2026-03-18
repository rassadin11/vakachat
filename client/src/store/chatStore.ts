import { create } from 'zustand';
import type { Chat, Message, Model, User } from '../types';
import { fetchModels as apiFetchModels, fetchModels, streamChat, streamGuestChat, type StreamOptions, type ApiMessage } from '../api/openrouter';
import type { Attachment } from '../types';
import { chatApi } from '../api/chats';
import { calcMaxTokens } from '../utils/calcMaxTokens';

export const GUEST_ALLOWED_PREFIXES = ['deepseek/', 'thudm/', 'z-ai/'];
const TRIAL_STORAGE_KEY = 'vakachat_trial_left';
const TRIAL_MAX = 5;

function getTrialLeft(): number {
  const stored = localStorage.getItem(TRIAL_STORAGE_KEY);
  if (stored === null) return TRIAL_MAX;
  const val = parseInt(stored, 10);
  return isNaN(val) ? TRIAL_MAX : Math.max(0, val);
}

function isGuestModel(modelId: string): boolean {
  return GUEST_ALLOWED_PREFIXES.some(p => modelId.startsWith(p));
}

export type NotificationType = 'balance' | 'trial';

export interface AppNotification {
  type: NotificationType;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}

export const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-5';

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
  isGuest: boolean;
  trialRequestsLeft: number;
  chats: Chat[];
  activeChat: Chat | null;
  models: Model[];
  isLoadingModels: boolean;
  isChatLoading: boolean;
  isStreaming: boolean;
  activeModel: Model;
  abortController: AbortController | null;
  sidebarOpen: boolean;
  isResearch: boolean;
  errorMessage: string;
  contextLimit: number;
  notification: AppNotification | null;

  setContextLimit: (limit: number) => void;
  setNotification: (n: AppNotification | null) => void;
  setIsResearch: (isResearch: boolean) => void;
  toggleSidebar: () => void;
  setIsChatLoading: (value: boolean) => void;
  setUser: (data: User) => void;
  setChats: (chats: Chat[]) => void;
  setIsGuest: (value: boolean) => void;
  createChat: (message: string, systemPrompt: string) => Promise<Chat>;
  deleteChat: (id: string) => void;
  setActiveChat: (id: string) => Promise<boolean>;
  setModel: (modelId: string) => void;
  sendMessage: (content: string, options?: StreamOptions, attachments?: Attachment[]) => Promise<void>;
  editMessage: (chatId: string, messageId: string, newContent: string, options?: StreamOptions) => Promise<void>;
  changeChatTitle: (chatId: string, newTitle: string) => void;
  stopStreaming: () => void;
  resetModel: () => void;
  fetchModels: () => Promise<void>;
  handleContextMessage: (messageId: string) => Promise<boolean>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  user: null,
  isGuest: false,
  trialRequestsLeft: getTrialLeft(),
  chats: [],
  activeChat: null,
  models: [],
  isLoadingModels: false,
  isStreaming: false,
  abortController: null,
  activeModel: {
    "id": "google/gemini-3.1-flash-lite-preview",
    "name": "Google: Gemini 3.1 Flash Lite Preview",
    "context_length": 1048576,
    "architecture": {
      "modality": "text+image+file+audio+video->text",
      "input_modalities": [
        "text",
        "image",
        "video",
        "file",
        "audio"
      ],
      "output_modalities": [
        "text"
      ],
      "tokenizer": "Gemini",
      "instruct_type": null
    },
    "pricing": {
      "prompt": "0.00000025",
      "completion": "0.0000015",
      "promptRUB": "0.000026",
      "completionRUB": "0.000156",
    },
    "supported_parameters": [
      "include_reasoning",
      "max_tokens",
      "reasoning",
      "response_format",
      "seed",
      "stop",
      "structured_outputs",
      "temperature",
      "tool_choice",
      "tools",
      "top_p"
    ],
    "default_parameters": {
      "temperature": null,
      "top_p": null,
      "top_k": null,
      "frequency_penalty": null,
      "presence_penalty": null,
      "repetition_penalty": null
    },
  },
  sidebarOpen: true,
  errorMessage: '',
  contextLimit: 0,
  notification: null,
  isResearch: false,
  isChatLoading: false,

  setIsChatLoading: (val) => set({ isChatLoading: val }),
  setContextLimit: (limit) => set({ contextLimit: limit }),
  setNotification: (n) => set({ notification: n }),
  setIsResearch: (val) => set({ isResearch: val }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  setUser: (user: User) => {
    set(() => ({ user }))
  },

  setIsGuest: (value) => {
    set({ isGuest: value });
  },

  createChat: async (message, systemPrompt = '') => {
    const { isGuest } = get();

    if (isGuest) {
      const guestChat: Chat = {
        id: generateId(),
        title: message.trim().split(/\s+/).slice(0, 5).join(' '),
        systemPrompt: systemPrompt || null,
        userId: 'guest',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        messages: [],
      };
      set((state) => ({
        chats: [guestChat, ...state.chats],
        activeChat: guestChat,
      }));
      return guestChat;
    }

    set(() => ({ isChatLoading: true }));
    const newChat = await chatApi.newChat({ title: message, systemPrompt }).then(res => res);

    set((state) => ({
      chats: [{ ...newChat, messages: [] }, ...state.chats],
      activeChat: { ...newChat, messages: [] },
      isChatLoading: false,
    }));

    return { ...newChat, messages: [] }
  },

  deleteChat: async (id) => {
    const { isGuest } = get();
    if (isGuest) {
      set((state) => ({
        chats: state.chats.filter((c) => c.id !== id),
        activeChat: state.activeChat?.id === id ? null : state.activeChat,
      }));
      return;
    }
    try {
      await chatApi.removeChat(id);
      set((state) => ({
        chats: state.chats.filter((c) => c.id !== id),
        activeChat: state.activeChat?.id === id ? null : state.activeChat,
      }));
    } catch (e) {
      console.log('Failed to delete chat:', e);
    }
  },

  setActiveChat: async (id) => {
    const { isGuest, chats } = get();
    if (isGuest) {
      const chat = chats.find(c => c.id === id);
      if (chat) {
        set({ activeChat: chat });
        return true;
      }
      return false;
    }
    try {
      set(() => ({ isChatLoading: true }));
      const data = await chatApi.getChat(id);
      set({ activeChat: data, isChatLoading: false });
      return true
    } catch (e) {
      set({ isChatLoading: false });
      return false
    }
  },

  setChats: (chats: Chat[]) => {
    set(() => ({
      chats,
    }));
  },

  setModel: async (modelId) => {
    const { models } = get()

    if (!models.length) {
      const newModels = await fetchModels();

      set(() => ({
        models: newModels
      }))
    }

    console.log(modelId.includes('research'))
    if (modelId.includes('research')) {
      set(() => ({
        isResearch: true
      }))
    } else {
      set(() => ({
        isResearch: false
      }))
    }

    set((state) => ({
      activeModel: state.models.find(m => m.id === modelId) as Model || state.models[0]
    }));
  },

  resetModel: () => {
    set(state => ({
      activeModel: state.models.find(m => m.id === 'deepseek/deepseek-v3.2'),
      isResearch: false
    }))
  },

  stopStreaming: () => {
    const { abortController } = get();
    abortController?.abort();
    set({ isStreaming: false, abortController: null });
  },

  sendMessage: async (content, options, attachments) => {
    const { activeChat, contextLimit, isStreaming, activeModel, user, isGuest, trialRequestsLeft, changeChatTitle, setNotification } = get();

    if (isStreaming) return;
    if (!content.trim() && !attachments?.length) return;
    if (!activeChat) return;

    // ── Ранние проверки до добавления сообщений ───────────────
    if (isGuest) {
      if (!isGuestModel(activeModel.id)) {
        setNotification({
          type: 'trial',
          message: 'Выберите модель DeepSeek или zAI GLM для пробного режима.',
          actionLabel: 'Зарегистрироваться',
          actionHref: '/register',
        });
        return;
      }
      if (trialRequestsLeft <= 0) {
        setNotification({
          type: 'trial',
          message: 'Пробные запросы закончились. Зарегистрируйтесь, чтобы продолжить.',
          actionLabel: 'Зарегистрироваться',
          actionHref: '/register',
        });
        return;
      }
    } else {
      const modelPricePerToken = parseFloat(activeModel.pricing?.completion ?? '0');
      const maxTokens = calcMaxTokens(Number(user?.balanceUSD), modelPricePerToken);
      if (maxTokens === 0) {
        setNotification({
          type: 'balance',
          message: 'Недостаточно средств. Пополните баланс для продолжения.',
          actionLabel: 'Пополнить',
          actionHref: '/profile',
        });
        return;
      }
    }

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      name: 'Пользователь',
      content,
      inContext: true,
      attachments: attachments?.length ? attachments : undefined,
      createdAt: new Date(),
    };

    const assistantMessageId = generateId();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      name: activeModel.name,
      model: activeModel.id,
      inContext: true,
      content: '',
      createdAt: new Date(),
    };

    const isFirstMessage = activeChat.messages.length === 0 && activeChat.title === 'Новый чат';
    const controller = new AbortController();

    set((state) => ({
      isStreaming: true,
      abortController: controller,
      chats: state.chats.map((c) =>
        c.id === activeChat.id
          ? {
            ...c,
            title: isFirstMessage ? generateTitle(content) : c.title,
            messages: [...c.messages, userMessage, assistantMessage],
          }
          : c,
      ),
      activeChat: {
        ...activeChat,
        title: isFirstMessage ? generateTitle(content) : activeChat.title,
        messages: [...activeChat.messages, userMessage, assistantMessage],
      },
    }));

    if (isFirstMessage) {
      changeChatTitle(activeChat.id, generateTitle(content));
    }

    // ── Общие колбэки для стриминга ──────────────────────────

    const onChunk = (chunk: string) => {
      set((state) => ({
        activeChat: state.activeChat
          ? {
            ...state.activeChat,
            messages: state.activeChat.messages.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: m.content + chunk }
                : m,
            ),
          }
          : null,
      }));
    };

    const onDone = () => {
      set({ isStreaming: false, abortController: null });
    };

    const onError = (error: Error) => {
      console.error('[sendMessage] Stream error:', error);
      set((state) => ({
        isStreaming: false,
        abortController: null,
        activeChat: state.activeChat
          ? {
            ...state.activeChat,
            messages: state.activeChat.messages.map((m) =>
              m.id === assistantMessageId && m.content === ''
                ? { ...m, content: error?.message }
                : m,
            ),
          }
          : null,
      }));
    };

    // ── Гостевой путь ─────────────────────────────────────────

    if (isGuest) {
      const newLeft = trialRequestsLeft - 1;
      localStorage.setItem(TRIAL_STORAGE_KEY, String(newLeft));
      set({ trialRequestsLeft: newLeft });

      const messagesForGuest: ApiMessage[] = [
        ...(options?.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
        ...activeChat.messages
          .filter(m => m.inContext && m.id !== assistantMessageId)
          .map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content },
      ];

      await streamGuestChat(
        { messages: messagesForGuest, model: activeModel.id, signal: controller.signal },
        { onChunk, onDone, onError },
      );
      return;
    }

    // ── Авторизованный путь ───────────────────────────────────

    const modelMeta = get().models.find((m) => m.id === activeModel.id);
    const isImageModel =
      modelMeta?.architecture?.output_modalities?.includes('image') ?? false;

    const modelPricePerToken = parseFloat(activeModel.pricing?.completion ?? '0');
    const maxTokens = calcMaxTokens(Number(user?.balanceUSD), modelPricePerToken);

    await streamChat(
      {
        chatId: activeChat.id,
        userId: user?.id ?? '',
        message: content,
        price: {
          income: +activeModel.pricing.prompt,
          outcome: +activeModel.pricing.completion,
        },
        maxTokens: maxTokens || Infinity,
        contextLimit,
        model: activeModel.id,
        modelName: activeModel.name,
        options: { ...options, imageModel: isImageModel },
        signal: controller.signal,
        attachments,
      },
      {
        onChunk,
        onDone,
        onError,

        onImage: (imageUrl, imageContent) => {
          set((state) => ({
            activeChat: state.activeChat
              ? {
                ...state.activeChat,
                messages: state.activeChat.messages.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, image: imageUrl, content: imageContent }
                    : m,
                ),
              }
              : null,
          }));
        },

        onSync: (userMessageId, balance, balanceUSD) => {
          set((state) => {
            if (!state.activeChat) return {};

            const messages = state.activeChat.messages;
            const lastUserIdx = [...messages].reverse().findIndex(m => m.role === 'user');
            const realIdx = lastUserIdx === -1 ? -1 : messages.length - 1 - lastUserIdx;

            if (realIdx === -1) return {};

            return {
              activeChat: {
                ...state.activeChat,
                messages: messages.map((m, idx) =>
                  idx === realIdx ? { ...m, id: userMessageId, inContext: true } : m
                ),
              },
              user: state.user ? { ...state.user, balance, balanceUSD } : null,
            };
          });
        },
      },
    );
  },

  changeChatTitle: async (chatId, newTitle) => {
    const { isGuest } = get();
    if (!isGuest) {
      await chatApi.updateChatTitle(chatId, newTitle);
    }
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId ? { ...c, title: newTitle } : c,
      ),
      activeChat:
        state.activeChat?.id === chatId
          ? { ...state.activeChat, title: newTitle }
          : state.activeChat,
    }));
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
      model: activeModel.id,
      inContext: true,
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

    // const modelMeta = get().models.find((m) => m.id === activeModel.id);
    // const isImageModel = modelMeta?.architecture?.output_modalities?.includes('image') ?? false;

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
      const models = await apiFetchModels();

      if (models) {
        const { isGuest } = get();
        const updates: Partial<ChatStore> = { models, isLoadingModels: false };

        if (isGuest) {
          const firstGuestModel = models.find(m => isGuestModel(m.id));
          if (firstGuestModel) updates.activeModel = firstGuestModel;
        }

        set(updates);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
      set({ isLoadingModels: false });
    }
  },

  handleContextMessage: async (messageId) => {
    try {
      const { activeChat, user } = get();
      if (!activeChat || !user) return false;

      await chatApi.changeContextMessage(activeChat.id, messageId, user.id);

      set(state => {
        if (!state.activeChat) return {};

        const messages = state.activeChat.messages;
        const idx = messages.findIndex(m => m.id === messageId);
        if (idx === -1) return {};

        const newValue = !messages[idx].inContext;

        const nextAssistant = messages
          .slice(idx + 1)
          .find(m => m.role === 'assistant');

        return {
          activeChat: {
            ...state.activeChat,
            messages: messages.map(m => {
              if (m.id === messageId) return { ...m, inContext: newValue };
              if (nextAssistant && m.id === nextAssistant.id) return { ...m, inContext: newValue };
              return m;
            }),
          },
        };
      });

      return true;
    } catch (error) {
      console.error('Failed to change message context:', error);
      return false;
    }
  }
}));
