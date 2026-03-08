import { ChatResponse } from "../api/chats";

export interface User {
  id: string;
  email: string;
  balance: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  /** base64 data URL for images; raw text for text files */
  data: string;
  isImage: boolean;
  size: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  name: string;
  content: string;
  image?: string;
  modelId?: string;
  modelName?: string;
  attachments?: Attachment[];
  createdAt: Date;
}

export interface Chat extends ChatResponse {
  messages: Message[];
}
