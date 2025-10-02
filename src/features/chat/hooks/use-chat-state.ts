import { useCallback, useEffect, useMemo, useState } from 'react';
import { createId } from '../../../lib/id';
import type { ChatMessage, ChatThread } from '../types';
import {
  loadActiveChatId,
  loadChats,
  resetChats,
  saveActiveChatId,
  saveChats
} from '../state/chat-store';

export const useChatState = () => {
  const [chats, setChats] = useState<ChatThread[]>(() => loadChats());
  const [activeChatId, setActiveChatId] = useState<string | null>(() => loadActiveChatId());

  useEffect(() => {
    saveChats(chats);
  }, [chats]);

  useEffect(() => {
    saveActiveChatId(activeChatId);
  }, [activeChatId]);

  useEffect(() => {
    if (activeChatId && !chats.some(chat => chat.id === activeChatId)) {
      setActiveChatId(chats[0] ? chats[0].id : null);
    }
  }, [activeChatId, chats]);

  const activeChat = useMemo(
    () => chats.find(chat => chat.id === activeChatId) || null,
    [chats, activeChatId]
  );

  const selectChat = useCallback((chatId: string) => {
    setActiveChatId(chatId);
  }, []);

  const createChat = useCallback(() => {
    const now = Date.now();
    const newChat: ChatThread = {
      id: createId('chat'),
      title: 'Untitled chat',
      updatedAt: now,
      messages: [],
      lastPresetId: null
    };
    setChats(previous => [newChat, ...previous]);
    setActiveChatId(newChat.id);
    return newChat.id;
  }, []);

  const updateChatTitle = useCallback((chatId: string, title: string) => {
    setChats(previous =>
      previous.map(chat =>
        chat.id === chatId
          ? {
              ...chat,
              title,
              updatedAt: Date.now()
            }
          : chat
      )
    );
  }, []);

  const appendMessage = useCallback((chatId: string, message: ChatMessage) => {
    setChats(previous =>
      previous.map(chat => {
        if (chat.id !== chatId) return chat;
        return {
          ...chat,
          messages: [...chat.messages, message],
          updatedAt: message.createdAt
        };
      })
    );
  }, []);

  const updateMessage = useCallback(
    (chatId: string, messageId: string, patch: Partial<Omit<ChatMessage, 'id'>>) => {
    setChats(previous =>
      previous.map(chat => {
        if (chat.id !== chatId) return chat;

        let didUpdate = false;
        const nextMessages = chat.messages.map(message => {
          if (message.id !== messageId) {
            return message;
          }
          didUpdate = true;
          return {
            ...message,
            ...patch
          };
        });

        if (!didUpdate) return chat;

        return {
          ...chat,
          messages: nextMessages,
          updatedAt: patch.createdAt ?? Date.now()
        };
      })
    );
  }, []);

  const removeMessage = useCallback((chatId: string, messageId: string) => {
    setChats(previous =>
      previous.map(chat => {
        if (chat.id !== chatId) return chat;
        const filteredMessages = chat.messages.filter(message => message.id !== messageId);
        if (filteredMessages.length === chat.messages.length) return chat;
        const nextUpdatedAt = filteredMessages.length > 0 ? filteredMessages[filteredMessages.length - 1].createdAt : Date.now();
        return {
          ...chat,
          messages: filteredMessages,
          updatedAt: nextUpdatedAt
        };
      })
    );
  }, []);

  const setChatPreset = useCallback((chatId: string, presetId: string | null) => {
    setChats(previous =>
      previous.map(chat =>
        chat.id === chatId
          ? {
              ...chat,
              lastPresetId: presetId,
              updatedAt: Date.now()
            }
          : chat
      )
    );
  }, []);

  const cloneChatUpToMessage = useCallback((chatId: string, messageId: string | null) => {
    let createdChatId: string | null = null;

    setChats(previous => {
      const source = previous.find(chat => chat.id === chatId);
      if (!source) return previous;

      const targetIndex = messageId
        ? source.messages.findIndex(message => message.id === messageId)
        : source.messages.length - 1;
      const sliceCount = targetIndex >= 0 ? targetIndex + 1 : source.messages.length;
      const portion = source.messages.slice(0, sliceCount);
      const now = Date.now();

      const newMessages = portion.map(message => ({
        ...message,
        id: createId('msg')
      }));

      const updatedAt = newMessages.length > 0 ? newMessages[newMessages.length - 1].createdAt : now;
      const baseTitle = source.title || 'Untitled chat';
      const cloneTitle = baseTitle.endsWith(' (branch)') ? baseTitle : baseTitle + ' (branch)';

      const clonedChat: ChatThread = {
        id: createId('chat'),
        title: cloneTitle,
        updatedAt,
        messages: newMessages,
        lastPresetId: source.lastPresetId ?? null
      };

      createdChatId = clonedChat.id;

      return [clonedChat, ...previous];
    });

    if (createdChatId) {
      setActiveChatId(createdChatId);
    }
    return createdChatId;
  }, []);

  const removeChat = useCallback((chatId: string) => {
    let resolvedActiveId: string | null = null;
    setChats(previous => {
      const nextChats = previous.filter(chat => chat.id !== chatId);
      setActiveChatId(current => {
        if (current !== chatId) {
          resolvedActiveId = current;
          return current;
        }
        const nextActive = nextChats[0] ? nextChats[0].id : null;
        resolvedActiveId = nextActive;
        return nextActive;
      });
      return nextChats;
    });
    return resolvedActiveId;
  }, []);

  const clearAll = useCallback(() => {
    const { chats: freshChats, activeChatId: freshActive } = resetChats();
    setChats(freshChats);
    setActiveChatId(freshActive);
  }, []);

  return {
    chats,
    activeChat,
    activeChatId,
    createChat,
    selectChat,
    updateChatTitle,
    appendMessage,
    updateMessage,
    removeMessage,
    setChatPreset,
    cloneChatUpToMessage,
    removeChat,
    clearAll
  } as const;
};
