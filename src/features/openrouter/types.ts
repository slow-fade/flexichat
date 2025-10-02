export type OpenRouterModel = {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
};

export type OpenRouterChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type CreateChatCompletionInput = {
  endpoint: string;
  apiKey: string;
  model: string;
  messages: OpenRouterChatMessage[];
  extras?: Record<string, unknown>;
};

export type ChatCompletionChoice = {
  index: number;
  message?: {
    role?: string;
    content?: unknown;
  };
  finish_reason?: string;
};

export type ChatCompletionResponse = {
  id?: string;
  choices?: ChatCompletionChoice[];
};

export type ListModelsResponse = {
  data?: Array<{
    id: string;
    name?: string;
    description?: string;
    context_length?: number;
  }>;
};
