import { ChatResponse } from "../api/chats";

export interface User {
  id: string;
  email: string;
  balance: string | number;
  balanceUSD: string | number;
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  /** base64 data URL for images; raw text for text files */
  data: string;
  isImage: boolean;
  isDocument: boolean;
  size: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  name: string;
  content: string;
  inContext: boolean;
  image?: string;
  model?: string;
  modelName?: string;
  attachments?: Attachment[];
  createdAt: Date;
}

export interface Chat extends ChatResponse {
  messages: Message[];
}

export interface Model {
  id: string;
  name: string;
  context_length: number;
  architecture: {
    modality: string;
    input_modalities: string[];
    output_modalities: string[];
    tokenizer: string;
    instruct_type: string | null;
  };
  pricing: {
    prompt: string;
    completion: string;
    promptRUB: string;
    completionRUB: string;
  };
  supported_parameters: string[];
  default_parameters: {
    temperature: number | null;
    top_p: number | null;
    frequency_penalty: number | null;
  };
}