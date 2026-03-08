import type { OpenRouterModel, Attachment } from '../types';
import { getAccessToken } from './client';

import { client } from "./client"; // твой настроенный axios/fetch клиент

export async function fetchModels(): Promise<OpenRouterModel[]> {
  const data = await client.get<{ data: OpenRouterModel[] }>("/models");
  return data.data;
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

function urlToMarkdown(url: string): string {
  return `![](<${url}>)`;
}

function extractContent(content: unknown): string {
  if (typeof content === 'string') {
    const trimmed = content.trim();
    // Если строка — это URL картинки, оборачиваем в markdown-изображение
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:image/')) {
      return urlToMarkdown(trimmed);
    }
    return trimmed;
  }
  if (Array.isArray(content)) {
    return content
      .map((part: { type: string; text?: string; image_url?: { url: string }; url?: string }) => {
        if (part.type === 'text') return part.text ?? '';
        if (part.type === 'image_url') {
          const url = part.image_url?.url ?? part.url;
          return url ? urlToMarkdown(url) : '';
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  }
  return '';
}

export async function streamChat(
  chatId: string,
  userMessage: string,
  model: string,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (error: Error) => void,
  options?: StreamOptions,
  signal?: AbortSignal,
  onImage?: (url: string, content: string) => void,
): Promise<void> {
  const token = getAccessToken();
  if (!token) {
    onError(new Error('Unauthorized: no access token'));
    return;
  }

  const isImageModel = options?.imageModel ?? false;

  const body: Record<string, unknown> = {
    chatId,
    userMessage,
    model,
    isImageModel,
    ...(options?.systemPrompt ? { systemPrompt: options.systemPrompt } : {}),
    ...(options?.plugins?.length ? { plugins: options.plugins } : {}),
  };

  let response: Response;
  try {
    response = await fetch(`${import.meta.env.BASE_URL}/chats/${chatId}/proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') { onDone(); return; }
    onError(err instanceof Error ? err : new Error('Network error'));
    return;
  }

  if (response.status === 401) {
    onError(new Error('Unauthorized: token expired'));
    return;
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    const message = detail?.error ?? `API error: ${response.status}`;
    onError(new Error(message));
    return;
  }

  // ── IMAGE MODEL ──────────────────────────────────────────────
  if (isImageModel) {
    try {
      const data = await response.json();
      const text = extractContent(data.choices?.[0]?.message?.content);
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

  // ── STREAMING ────────────────────────────────────────────────
  if (!response.body) {
    onError(new Error('No response body'));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') { onDone(); return; }

        try {
          const parsed = JSON.parse(data);

          // Ошибка внутри стрима (бэкенд прислал {"error":...})
          if (parsed.error) {
            onError(new Error(parsed.error));
            return;
          }

          const delta = parsed.choices?.[0]?.delta?.content;
          if (typeof delta === 'string') {
            onChunk(delta);
          } else if (Array.isArray(delta)) {
            for (const part of delta) {
              if (part.type === 'text') onChunk(part.text);
              else if (part.type === 'image_url' && onImage) onImage(part.image_url.url, part.content);
            }
          }
        } catch {
          // игнорируем невалидный JSON
        }
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') { onDone(); return; }
    onError(err instanceof Error ? err : new Error('Stream read error'));
    return;
  }

  onDone();
}
