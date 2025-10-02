import { useCallback, useEffect, useRef, useState } from 'react';
import { createId } from '../lib/id';
import { clearBrowserState } from '../lib/storage';
import { ChatSidebar } from '../features/chat/components/chat-sidebar';
import { ChatThreadView } from '../features/chat/components/chat-thread';
import { ChatComposer } from '../features/chat/components/chat-composer';
import { useChatState } from '../features/chat/hooks/use-chat-state';
import { usePresetState } from '../features/presets/hooks/use-preset-state';
import { PresetPanel } from '../features/presets/components/preset-panel';
import { buildExtrasFromParameters, buildRequestMessages, createChatCompletion } from '../features/openrouter/api';
import type { ChatThread } from '../features/chat/types';
import type { Preset } from '../features/presets/types';
import type { OpenRouterChatMessage } from '../features/openrouter/types';

const DEFAULT_ERROR_MESSAGE =
  'Unable to contact OpenRouter. Please confirm the preset has a valid API key and try again.';

const mapHistoryToMessages = (chat: ChatThread | null): OpenRouterChatMessage[] => {
  if (!chat) return [];
  return chat.messages.map(message => ({
    role: message.role,
    content: message.content
  }));
};

const resolvePresetForRequest = (preset: Preset | null) => {
  if (!preset) {
    throw new Error('Select a preset with an API key before sending a message.');
  }

  if (!preset.apiKey) {
    throw new Error('Add an OpenRouter API key to the selected preset before sending a message.');
  }

  return {
    ...preset,
    apiEndpoint: preset.apiEndpoint || 'https://openrouter.ai/api/v1/chat/completions'
  };
};

const extractChatIdFromHash = (hash: string): string | null => {
  const match = hash.match(/^#\/?chat\/([^/]+)$/);
  return match ? match[1] : null;
};

const App = () => {
  const {
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
    clearAll: clearChats
  } = useChatState();
  const {
    presets,
    activePreset,
    activePresetId,
    selectPreset,
    createPreset,
    updatePreset,
    removePreset,
    clearAll: clearPresets
  } = usePresetState();
  const [isResponding, setIsResponding] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const [activeRequest, setActiveRequest] = useState<{
    controller: AbortController;
    messageId: string;
  } | null>(null);
  const activeChatIdRef = useRef<string | null>(activeChatId);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  const updateHashForChat = useCallback((chatId: string | null) => {
    if (typeof window === 'undefined') return;
    const target = chatId ? '#/chat/' + chatId : '#/';
    if (window.location.hash === target) return;
    try {
      window.history.replaceState(null, '', target);
    } catch {
      window.location.hash = target.startsWith('#') ? target.slice(1) : target;
    }
  }, []);

  const handleSendMessage = async (message: string) => {
    const previousActiveChatId = activeChatId;
    const existingChat: ChatThread | null = previousActiveChatId
      ? chats.find(thread => thread.id === previousActiveChatId) || activeChat || null
      : null;

    let chatId = previousActiveChatId;
    if (!chatId) {
      chatId = handleCreateChat();
    }
    const now = Date.now();
    const userMessage = {
      id: createId('msg'),
      role: 'user' as const,
      content: message,
      createdAt: now
    };
    appendMessage(chatId, userMessage);

    if (!activeChat || activeChat.title === 'Untitled chat') {
      const suggestedTitle = message.length > 42 ? message.slice(0, 39) + '...' : message;
      updateChatTitle(chatId, suggestedTitle);
    }

    const pendingMessageId = createId('msg');
    appendMessage(chatId, {
      id: pendingMessageId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      status: 'pending'
    });

    const controller = new AbortController();
    setActiveRequest({ controller, messageId: pendingMessageId });
    setIsResponding(true);
    try {
      const presetForRequest = resolvePresetForRequest(activePreset || null);
      setChatPreset(chatId, presetForRequest.id);
      const history = mapHistoryToMessages(existingChat);
      const requestMessages = buildRequestMessages({
        instructions: presetForRequest.instructions,
        history,
        userMessage: { role: 'user', content: message }
      });
      const extras = buildExtrasFromParameters(presetForRequest.requestParameters);
      const { content } = await createChatCompletion(
        {
          endpoint: presetForRequest.apiEndpoint,
          apiKey: presetForRequest.apiKey,
          model: presetForRequest.model,
          messages: requestMessages,
          extras
        },
        controller.signal
      );

      updateMessage(chatId, pendingMessageId, {
        content,
        status: 'complete',
        createdAt: Date.now()
      });
    } catch (error) {
      const isAbortError = error instanceof DOMException && error.name === 'AbortError';
      const messageText = isAbortError
        ? 'Request cancelled.'
        : error instanceof Error
          ? error.message
          : DEFAULT_ERROR_MESSAGE;
      updateMessage(chatId, pendingMessageId, {
        content: messageText || DEFAULT_ERROR_MESSAGE,
        status: isAbortError ? 'cancelled' : 'error',
        createdAt: Date.now()
      });
    } finally {
      setActiveRequest(current => (current?.messageId === pendingMessageId ? null : current));
      setIsResponding(false);
    }
  };

  const handleRegenerateAssistantMessage = async (messageId: string) => {
    if (!activeChat || !activeChatId) return;
    if (activeRequest) return;

    const assistantIndex = activeChat.messages.findIndex(message => message.id === messageId);
    if (assistantIndex === -1) return;

    const targetMessage = activeChat.messages[assistantIndex];
    if (targetMessage.role !== 'assistant') return;

    const previousMessages = activeChat.messages.slice(0, assistantIndex);
    let lastUserIndex = -1;
    for (let index = previousMessages.length - 1; index >= 0; index -= 1) {
      if (previousMessages[index].role === 'user') {
        lastUserIndex = index;
        break;
      }
    }

    if (lastUserIndex === -1) return;

    const lastUserMessage = previousMessages[lastUserIndex];
    const historyMessages = previousMessages.slice(0, lastUserIndex).map(message => ({
      role: message.role,
      content: message.content
    }));

    updateMessage(activeChatId, messageId, {
      content: '',
      status: 'pending',
      createdAt: Date.now()
    });

    const controller = new AbortController();
    setActiveRequest({ controller, messageId });
    setIsResponding(true);
    try {
      const presetForRequest = resolvePresetForRequest(activePreset || null);
      setChatPreset(activeChatId, presetForRequest.id);
      const requestMessages = buildRequestMessages({
        instructions: presetForRequest.instructions,
        history: historyMessages,
        userMessage: { role: 'user', content: lastUserMessage.content }
      });
      const extras = buildExtrasFromParameters(presetForRequest.requestParameters);
      const { content } = await createChatCompletion(
        {
          endpoint: presetForRequest.apiEndpoint,
          apiKey: presetForRequest.apiKey,
          model: presetForRequest.model,
          messages: requestMessages,
          extras
        },
        controller.signal
      );
      updateMessage(activeChatId, messageId, {
        content,
        status: 'complete',
        createdAt: Date.now()
      });
    } catch (error) {
      const isAbortError = error instanceof DOMException && error.name === 'AbortError';
      const messageText = isAbortError
        ? 'Request cancelled.'
        : error instanceof Error
          ? error.message
          : DEFAULT_ERROR_MESSAGE;
      updateMessage(activeChatId, messageId, {
        content: messageText || DEFAULT_ERROR_MESSAGE,
        status: isAbortError ? 'cancelled' : 'error',
        createdAt: Date.now()
      });
    } finally {
      setActiveRequest(current => (current?.messageId === messageId ? null : current));
      setIsResponding(false);
    }
  };

  const handleReset = () => {
    clearBrowserState();
    clearChats();
    clearPresets();
    updateHashForChat(null);
  };

  useEffect(() => {
    if (!activeChat) return;
    const chatPresetId = activeChat.lastPresetId;
    if (!chatPresetId || chatPresetId === activePresetId) return;
    const presetExists = presets.some(preset => preset.id === chatPresetId);
    if (presetExists) {
      selectPreset(chatPresetId);
    }
  }, [activeChat, activePresetId, presets, selectPreset]);

  const handleSelectPreset = (presetId: string) => {
    selectPreset(presetId);
    if (activeChatId) {
      setChatPreset(activeChatId, presetId);
    }
  };

  const handleResizeSidebar = (nextWidth: number) => {
    setSidebarWidth(Math.max(240, Math.min(520, Math.round(nextWidth))));
  };

  const handleCancelPendingMessage = (messageId: string) => {
    setActiveRequest(current => {
      if (current && current.messageId === messageId) {
        current.controller.abort();
      }
      return current;
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const applyHashSelection = (hash: string) => {
      const chatIdFromHash = extractChatIdFromHash(hash);
      if (!chatIdFromHash) return;
      const exists = chats.some(chat => chat.id === chatIdFromHash);
      if (!exists) return;
      if (activeChatIdRef.current === chatIdFromHash) return;
      selectChat(chatIdFromHash);
    };

    applyHashSelection(window.location.hash);

    const handleHashChange = () => {
      applyHashSelection(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [chats, selectChat]);

  const handleSelectChat = useCallback(
    (chatId: string) => {
      selectChat(chatId);
      updateHashForChat(chatId);
    },
    [selectChat, updateHashForChat]
  );

  const handleCreateChat = useCallback(() => {
    const newChatId = createChat();
    updateHashForChat(newChatId);
    return newChatId;
  }, [createChat, updateHashForChat]);

  const handleDeleteChat = useCallback(
    (chatId: string) => {
      const nextActiveId = removeChat(chatId);
      updateHashForChat(nextActiveId ?? null);
    },
    [removeChat, updateHashForChat]
  );

  return (
    <div className="flex min-h-screen bg-background">
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onCreateChat={handleCreateChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={updateChatTitle}
        onReset={handleReset}
        width={sidebarWidth}
        onResize={handleResizeSidebar}
      />
      <main className="flex flex-1 flex-col">
        <PresetPanel
          presets={presets}
          activePresetId={activePresetId}
          onSelectPreset={handleSelectPreset}
          onCreatePreset={createPreset}
          onUpdatePreset={updatePreset}
          onDeletePreset={removePreset}
        />
        <ChatThreadView
          chat={activeChat}
          onDeleteMessage={messageId => {
            if (!activeChatId) return;
            removeMessage(activeChatId, messageId);
          }}
          onEditMessage={(messageId, content) => {
            if (!activeChatId) return;
            updateMessage(activeChatId, messageId, {
              content,
              status: 'complete',
              createdAt: Date.now()
            });
          }}
          onCloneFromMessage={messageId => {
            if (!activeChatId) return;
            const newChatId = cloneChatUpToMessage(activeChatId, messageId);
            if (newChatId) {
              updateHashForChat(newChatId);
            }
          }}
          onRegenerateMessage={messageId => {
            handleRegenerateAssistantMessage(messageId);
          }}
          pendingMessageId={activeRequest?.messageId ?? null}
          onCancelPendingMessage={handleCancelPendingMessage}
        />
        <ChatComposer onSend={handleSendMessage} disabled={!activeChatId || isResponding} />
      </main>
    </div>
  );
};

export default App;
