import type { OpenRouterModel, Attachment } from '../types';

const BASE_URL = 'https://openrouter.ai/api/v1';

function getHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': window.location.origin,
    'X-Title': 'VakaChat',
  };
}

export async function fetchModels(): Promise<OpenRouterModel[]> {
  const response = await fetch(`${BASE_URL}/models`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error(`Failed to fetch models: ${response.status}`);
  const data = await response.json();
  return data.data as OpenRouterModel[];
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
    console.log(img)
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
  messages: ApiMessage[],
  model: string,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (error: Error) => void,
  options?: StreamOptions,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response;

  const allMessages = [
    ...(options?.systemPrompt
      ? [{ role: 'system', content: options.systemPrompt }]
      : []),
    ...messages,
  ];

  const isImageModel = options?.imageModel ?? false;
  const body: Record<string, unknown> = { model, messages: allMessages };
  if (!isImageModel) body.stream = true;
  if (options?.plugins?.length) {
    body.plugins = options.plugins.map((id) => ({ id }));
  }

  try {
    response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') { onDone(); return; }
    onError(err instanceof Error ? err : new Error('Network error'));
    return;
  }

  if (!response.ok) {
    onError(new Error(`API error: ${response.status}`));
    return;
  }

  if (isImageModel) {
    try {
      const data = await response.json();
      console.log('[image model response]', data);

      let text = extractContent(data.choices?.[0]?.message.images[0].image_url.url);

      // Формат DALL-E: { data: [{ url: '...' }] }
      if (!text && Array.isArray(data.data)) {
        text = data.data
          .map((item: { url?: string; b64_json?: string }) => {
            if (item.url) return urlToMarkdown(item.url);
            if (item.b64_json) return urlToMarkdown(`data:image/png;base64,${item.b64_json}`);
            return '';
          })
          .filter(Boolean)
          .join('\n\n');
      }

      if (text) onChunk(text);
    } catch {
      onError(new Error('Failed to parse image response'));
      return;
    }
    onDone();
    return;
  }

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
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          onDone();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (typeof delta === 'string') {
            onChunk(delta);
          } else if (Array.isArray(delta)) {
            for (const part of delta) {
              if (part.type === 'text') onChunk(part.text);
              else if (part.type === 'image_url') onChunk(`![](<${part.image_url.url}>)`);
            }
          }
        } catch {
          // ignore malformed JSON lines
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
