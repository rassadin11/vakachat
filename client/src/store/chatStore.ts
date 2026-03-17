import { create } from 'zustand';
import type { Chat, Message, Model, User } from '../types';
import { fetchModels as apiFetchModels, fetchModels, streamChat, type StreamOptions } from '../api/openrouter';
import type { Attachment } from '../types';
import { chatApi } from '../api/chats';
import { calcMaxTokens } from '../utils/calcMaxTokens';

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

  setContextLimit: (limit: number) => void;
  setIsResearch: (isResearch: boolean) => void;
  toggleSidebar: () => void;
  setIsChatLoading: (value: boolean) => void;
  setUser: (data: User) => void;
  setChats: (chats: Chat[]) => void;
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
  chats: [],
  activeChat: null,
  models: [],
  isLoadingModels: false,
  isStreaming: false,
  abortController: null,
  activeModel: {
    "id": "deepseek/deepseek-v3.2",
    "name": "DeepSeek: DeepSeek V3.2",
    "context_length": 163840,
    "architecture": {
      "modality": "text->text",
      "input_modalities": [
        "text"
      ],
      "output_modalities": [
        "text"
      ],
      "tokenizer": "DeepSeek",
      "instruct_type": null
    },
    "pricing": {
      "prompt": "0.00000025",
      "completion": "0.0000004",
      "completionRUB": "0.0000416",
      "promptRUB": "0.000026"
    },
    "supported_parameters": [
      "frequency_penalty",
      "include_reasoning",
      "logit_bias",
      "logprobs",
      "max_tokens",
      "min_p",
      "presence_penalty",
      "reasoning",
      "repetition_penalty",
      "response_format",
      "seed",
      "stop",
      "structured_outputs",
      "temperature",
      "tool_choice",
      "tools",
      "top_k",
      "top_logprobs",
      "top_p"
    ],
    "default_parameters": {
      "temperature": 1,
      "top_p": 0.95,
      "top_k": null,
      "frequency_penalty": null,
      "presence_penalty": null,
      "repetition_penalty": null
    },
  },
  sidebarOpen: true,
  errorMessage: '',
  contextLimit: 0,
  isResearch: false,
  isChatLoading: false,

  setIsChatLoading: (val) => set({ isChatLoading: val }),
  setContextLimit: (limit) => set({ contextLimit: limit }),
  setIsResearch: (val) => set({ isResearch: val }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  setUser: (user: User) => {
    set(() => ({
      user
    }))
  },

  createChat: async (message, systemPrompt = '') => {
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
    const { activeChat, contextLimit, isStreaming, activeModel, user, changeChatTitle } = get();

    if (isStreaming) return;
    if (!content.trim() && !attachments?.length) return;
    if (!activeChat) return;

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

    set((state) => {
      return {
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
      };
    });

    if (isFirstMessage) {
      changeChatTitle(activeChat.id, generateTitle(content))
    }

    const modelMeta = get().models.find((m) => m.id === activeModel.id);
    const isImageModel =
      modelMeta?.architecture?.output_modalities?.includes('image') ?? false;

    const modelPricePerToken = parseFloat(activeModel.pricing?.completion ?? '0');
    const maxTokens = calcMaxTokens(Number(user?.balanceUSD), modelPricePerToken);

    if (maxTokens === 0) {
      set((state) => ({
        isStreaming: false,
        abortController: null,
        activeChat: state.activeChat
          ? {
            ...state.activeChat,
            messages: state.activeChat.messages.map((m) =>
              m.id === assistantMessageId && m.content === ''
                ? { ...m, content: 'Пополните баланс.' }
                : m,
            ),
          }
          : null,
      }));

      return;
    }

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
        onChunk: (chunk) => {
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
        },

        onDone: () => {
          set({ isStreaming: false, abortController: null });
        },

        onError: (error) => {
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
        },

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
    await chatApi.updateChatTitle(chatId, newTitle);
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
        // Оставляем порядок API как есть — он отражает популярность на OpenRouter
        set({ models, isLoadingModels: false });
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
