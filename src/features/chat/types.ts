export type MessageRole = 'assistant' | 'user';

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
};

export type ChatThread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
  lastPresetId?: string | null;
};
