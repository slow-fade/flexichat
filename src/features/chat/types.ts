export type MessageRole = 'assistant' | 'user';

export type MessageStatus = 'pending' | 'complete' | 'error' | 'cancelled';

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  status?: MessageStatus;
};

export type ChatThread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
  lastPresetId?: string | null;
};
