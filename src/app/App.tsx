import { useState } from 'react';
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

  const handleSendMessage = async (message: string) => {
    const hadActiveChat = Boolean(activeChatId);
    const existingChat: ChatThread | null = hadActiveChat
      ? chats.find(thread => thread.id === activeChatId) || activeChat || null
      : null;

    const chatId = activeChatId || createChat();
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

    setIsResponding(true);
    try {
      const presetForRequest = resolvePresetForRequest(activePreset || null);
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
        undefined
      );

      appendMessage(chatId, {
        id: createId('msg'),
        role: 'assistant',
        content,
        createdAt: Date.now()
      });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE;
      appendMessage(chatId, {
        id: createId('msg'),
        role: 'assistant',
        content: messageText || DEFAULT_ERROR_MESSAGE,
        createdAt: Date.now()
      });
    } finally {
      setIsResponding(false);
    }
  };

  const handleReset = () => {
    clearBrowserState();
    clearChats();
    clearPresets();
  };

  return (
    <div className="flex min-h-screen bg-background">
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={selectChat}
        onCreateChat={createChat}
        onDeleteChat={removeChat}
        onReset={handleReset}
      />
      <main className="flex flex-1 flex-col">
        <PresetPanel
          presets={presets}
          activePresetId={activePresetId}
          onSelectPreset={selectPreset}
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
            updateMessage(activeChatId, messageId, content);
          }}
          onCloneFromMessage={messageId => {
            if (!activeChatId) return;
            cloneChatUpToMessage(activeChatId, messageId);
          }}
          onRenameChat={(chatId, title) => {
            updateChatTitle(chatId, title);
          }}
        />
        <ChatComposer onSend={handleSendMessage} disabled={!activeChatId || isResponding} />
      </main>
    </div>
  );
};

export default App;
