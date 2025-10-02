import { createId } from '../../../lib/id';
import { createLocalStore, createSessionStore } from '../../../lib/storage';
import { STORAGE_KEYS } from '../../../lib/storage';
import type { ChatMessage, ChatThread } from '../types';

const createDefaultChats = (): ChatThread[] => {
  const now = Date.now();
  return [
    {
      id: createId('chat'),
      title: 'Welcome',
      updatedAt: now,
      messages: []
    }
  ];
};

const initialChats = createDefaultChats();

const isMessage = (value: unknown): value is ChatMessage => {
  if (!value || typeof value !== 'object') return false;
  const message = value as ChatMessage;
  return (
    typeof message.id === 'string' &&
    (message.role === 'assistant' || message.role === 'user') &&
    typeof message.content === 'string' &&
    typeof message.createdAt === 'number'
  );
};

const isChatThread = (value: unknown): value is ChatThread => {
  if (!value || typeof value !== 'object') return false;
  const thread = value as ChatThread;
  return (
    typeof thread.id === 'string' &&
    typeof thread.title === 'string' &&
    typeof thread.updatedAt === 'number' &&
    Array.isArray(thread.messages) &&
    thread.messages.every(isMessage)
  );
};

const isChatThreadList = (value: unknown): value is ChatThread[] =>
  Array.isArray(value) && value.every(isChatThread);

const chatsStore = createLocalStore(STORAGE_KEYS.chats, initialChats, isChatThreadList);

const activeChatStore = createSessionStore<string | null>(
  STORAGE_KEYS.activeChatId,
  initialChats[0] ? initialChats[0].id : null,
  (value): value is string | null => typeof value === 'string' || value === null
);

export const loadChats = () => chatsStore.read();

export const saveChats = (threads: ChatThread[]) => chatsStore.write(threads);

export const loadActiveChatId = () => activeChatStore.read();

export const saveActiveChatId = (chatId: string | null) => activeChatStore.write(chatId);

export const resetChats = () => {
  chatsStore.clear();
  activeChatStore.clear();
  return {
    chats: loadChats(),
    activeChatId: loadActiveChatId()
  };
};
