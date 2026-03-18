import type { Attachment, Model } from '../types';
import { authApi } from './auth';
import { clearAccessToken, getAccessToken, setAccessToken } from './client';

import { client } from "./client"; // твой настроенный axios/fetch клиент

export async function fetchModels(): Promise<Model[]> {
  const data = await client.get<Model[]>("/models");
  return data;
}

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export type ApiMessage = { role: string; content: string | ContentPart[] };

export function buildApiContent(text: string, attachments?: Attachment[]): string | ContentPart[] {
  const images = attachments?.filter((a) => a.isImage) ?? [];
  const texts = attachments?.filter((a) => !a.isImage) ?? [];

  let fullText = text;
  for (const att of texts) {
    const ext = att.name.split('.').pop() ?? '';
    fullText += `\n\n\`\`\`${ext}\n// ${att.name}\n${att.data}\n\`\`\``;
  }

  if (images.length === 0) return fullText;

  const parts: ContentPart[] = [];
  if (fullText) parts.push({ type: 'text', text: fullText });
  for (const img of images) {
    parts.push({ type: 'image_url', image_url: { url: img.data } });
  }
  return parts;
}

export interface StreamOptions {
  systemPrompt?: string;
  plugins?: string[];
  imageModel?: boolean;
}

interface StreamChatParams {
  chatId: string;
  userId: string;
  message: string;
  price: {
    income: number,
    outcome: number
  },
  maxTokens: number,
  contextLimit: number;
  model: string;
  modelName: string;
  options?: StreamOptions;
  signal?: AbortSignal;
  attachments?: Attachment[];
}

interface StreamChatCallbacks {
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
  onImage?: (url: string, content: string) => void;
  onSync?: (userMessageId: string, balance: number, balanceUSD: number) => void;
}

export const API_BASE = 'http://localhost:3000/api';

// ── Helpers ──────────────────────────────────────────────────

async function getValidToken(): Promise<string | null> {
  const token = getAccessToken();
  if (token) return token;

  try {
    const { accessToken } = await authApi.refresh();
    setAccessToken(accessToken);
    return accessToken;
  } catch {
    clearAccessToken();
    window.location.href = '/login';
    return null;
  }
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const response = await fetch(url, init);
  if (response.status !== 401) return response;

  // Один retry после refresh
  const { accessToken } = await authApi.refresh();
  setAccessToken(accessToken);

  return fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

function extractDelta(parsed: any, callbacks: StreamChatCallbacks) {
  const delta = parsed.choices?.[0]?.delta?.content;

  if (typeof delta === 'string') {
    callbacks.onChunk(delta);
    return;
  }

  if (Array.isArray(delta)) {
    for (const part of delta) {
      if (part.type === 'text') callbacks.onChunk(part.text);
      else if (part.type === 'image_url' && callbacks.onImage) {
        callbacks.onImage(part.image_url.url, part.content);
      }
    }
  }
}

// ── Main ─────────────────────────────────────────────────────

export interface GuestStreamParams {
  messages: ApiMessage[];
  model: string;
  signal?: AbortSignal;
}

export async function streamGuestChat(
  params: GuestStreamParams,
  callbacks: Pick<StreamChatCallbacks, 'onChunk' | 'onDone' | 'onError'>,
): Promise<void> {
  const { messages, model, signal } = params;
  const { onChunk, onDone, onError } = callbacks;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/guest/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model }),
      signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') { onDone(); return; }
    onError(err instanceof Error ? err : new Error('Network error'));
    return;
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    onError(new Error(detail?.error ?? `API error: ${response.status}`));
    return;
  }

  if (!response.body) { onError(new Error('No response body')); return; }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  signal?.addEventListener('abort', () => reader.cancel());

  try {
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (signal?.aborted) { await reader.cancel(); onDone(); return; }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw || raw === '[DONE]') continue;

        let parsed;
        try { parsed = JSON.parse(raw); } catch { continue; }

        if (parsed.type === 'done') { onDone(); return; }

        const delta = parsed.choices?.[0]?.delta?.content;
        if (typeof delta === 'string') onChunk(delta);
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') { onDone(); return; }
    if (signal?.aborted) { onDone(); return; }
    onError(err instanceof Error ? err : new Error('Stream read error'));
    return;
  }

  onDone();
}

export async function streamChat(
  params: StreamChatParams,
  callbacks: StreamChatCallbacks,
): Promise<void> {
  const { chatId, userId, message, price, maxTokens, contextLimit, model, modelName, options, signal, attachments } = params;
  const { onChunk, onDone, onError, onImage, onSync } = callbacks;

  const token = await getValidToken();
  if (!token) {
    onError(new Error('Session expired'));
    return;
  }

  const isImageModel = options?.imageModel ?? false;

  const body = {
    chatId,
    userId,
    role: 'user',
    content: message,
    price,
    maxTokens,
    contextLimit,
    model,
    modelName,
    isImageModel,
    ...(options?.systemPrompt && { systemPrompt: options.systemPrompt }),
    ...(options?.plugins?.length && { plugins: options.plugins }),
    ...(attachments?.length && { attachments }),
  };

  let response: Response;

  try {
    response = await fetchWithRetry(`${API_BASE}/chats/${chatId}/messages`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') { onDone(); return; }

    // refresh тоже мог упасть внутри fetchWithRetry
    if (err instanceof Error && err.message.includes('fetch')) {
      clearAccessToken();
      window.location.href = '/login';
    }

    onError(err instanceof Error ? err : new Error('Network error'));
    return;
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    onError(new Error(detail?.error ?? `API error: ${response.status}`));
    return;
  }

  // ── Image model (не стрим) ───────────────────────────────

  if (isImageModel) {
    try {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content ?? '';
      const text = typeof content === 'string' ? content : JSON.stringify(content);
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (imageUrl && onImage) onImage(imageUrl, text);
      if (text) onChunk(text);
    } catch {
      onError(new Error('Failed to parse image response'));
      return;
    }
    onDone();
    return;
  }

  // ── SSE stream ───────────────────────────────────────────

  if (!response.body) {
    onError(new Error('No response body'));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  signal?.addEventListener('abort', () => reader.cancel());

  try {
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (signal?.aborted) {
        await reader.cancel();
        onDone();
        return;
      }

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // неполная строка остаётся в буфере

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        const raw = line.slice(6).trim();
        if (!raw || raw === '[DONE]') continue;

        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          continue; // обрезанный чанк — ждём следующего
        }

        if (parsed.type === 'done') {
          onSync?.(parsed.userMessageId, parsed.balance, parsed.balanceUSD);
          onDone();
          return;
        }

        extractDelta(parsed, callbacks);
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') { onDone(); return; }
    if (signal?.aborted) { onDone(); return; } // reader.cancel() тоже может бросить
    onError(err instanceof Error ? err : new Error('Stream read error'));
    return;
  }

  onDone();
}