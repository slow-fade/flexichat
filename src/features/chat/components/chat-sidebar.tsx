import { useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import type { ChatThread } from '../types';

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

type ChatSidebarProps = {
  chats: ChatThread[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, title: string) => void;
  onReset: () => void;
  width: number;
  onResize: (nextWidth: number) => void;
};

export const ChatSidebar = ({
  chats,
  activeChatId,
  onSelectChat,
  onCreateChat,
  onDeleteChat,
  onRenameChat,
  onReset,
  width,
  onResize
}: ChatSidebarProps) => {
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = width;
    const MIN_WIDTH = 240;
    const MAX_WIDTH = 520;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      const delta = pointerEvent.clientX - startX;
      const nextWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + delta));
      onResize(nextWidth);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  const startEditingChat = (chat: ChatThread) => {
    setEditingChatId(chat.id);
    setTitleDraft(chat.title);
  };

  const cancelEditingChat = () => {
    setEditingChatId(null);
    setTitleDraft('');
  };

  const submitEditingChat = (chatId: string) => {
    const trimmed = titleDraft.trim();
    if (!trimmed) return;
    onRenameChat(chatId, trimmed);
    setEditingChatId(null);
    setTitleDraft('');
  };

  return (
    <aside
      className="relative flex flex-shrink-0 flex-col overflow-hidden border-r border-neutral-800 bg-sidebar p-4"
      style={{ width }}
    >
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-100">Chats</h1>
        <Button variant="secondary" size="icon" onClick={onCreateChat} aria-label="Start new chat">
          <span className="text-xl leading-none">+</span>
        </Button>
      </header>

      <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
        {chats.map(chat => {
          const isActive = chat.id === activeChatId;
          const isEditing = editingChatId === chat.id;

          return (
            <div
              key={chat.id}
              className={cn(
                'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm transition',
                isActive
                  ? 'border-neutral-500/60 bg-neutral-800/60'
                  : 'border-transparent hover:border-neutral-700 hover:bg-neutral-800/50'
              )}
            >
              {isEditing ? (
                <form
                  className="flex flex-1 items-center gap-2"
                  onSubmit={event => {
                    event.preventDefault();
                    submitEditingChat(chat.id);
                  }}
                >
                  <Input
                    value={titleDraft}
                    onChange={event => setTitleDraft(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        cancelEditingChat();
                      }
                    }}
                    autoFocus
                  />
                  <Button type="submit" variant="secondary" size="icon" aria-label="Save chat title">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={cancelEditingChat}
                    aria-label="Cancel renaming"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </form>
              ) : (
                <>
                  <button
                    onClick={() => onSelectChat(chat.id)}
                    className="flex-1 text-left"
                  >
                    <p className="line-clamp-1 font-medium text-neutral-100">{chat.title}</p>
                    <p className="text-xs text-neutral-400">{formatDate(chat.updatedAt)}</p>
                  </button>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={event => {
                        event.stopPropagation();
                        startEditingChat(chat);
                      }}
                      aria-label={`Rename ${chat.title}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          const confirmed = window.confirm(
                            'Delete this chat? This removes all messages in the conversation.'
                          );
                          if (!confirmed) return;
                        }
                        onDeleteChat(chat.id);
                      }}
                      aria-label={`Delete ${chat.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          );
        })}
        {chats.length === 0 && (
          <p className="text-sm text-neutral-400">No chats yet. Start a conversation.</p>
        )}
      </div>

      <footer className="mt-4">
        <Button variant="ghost" className="w-full justify-center" onClick={onReset}>
          Clear browser state
        </Button>
      </footer>
      <div
        className="absolute inset-y-0 right-0 w-1 cursor-col-resize select-none bg-transparent"
        onPointerDown={startResize}
        aria-hidden={true}
      />
    </aside>
  );
};
