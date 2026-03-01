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
  modelId?: string;
  attachments?: Attachment[];
  createdAt: Date;
}

export interface Chat {
  id: string;
  title: string;
  model: string;
  modelName: string;
  messages: Message[];
  createdAt: Date;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
  supported_parameters?: string[];
}
