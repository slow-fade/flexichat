import { Trash2 } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { Button } from '../../../components/ui/button';
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
  onReset: () => void;
};

export const ChatSidebar = ({
  chats,
  activeChatId,
  onSelectChat,
  onCreateChat,
  onDeleteChat,
  onReset
}: ChatSidebarProps) => (
  <aside className="flex w-72 flex-col border-r border-neutral-800 bg-sidebar p-4">
    <header className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-wide text-neutral-500">OpenRouter</p>
        <h1 className="text-lg font-semibold text-neutral-100">Chat sessions</h1>
      </div>
      <Button variant="secondary" size="icon" onClick={onCreateChat} aria-label="Start new chat">
        <span className="text-xl leading-none">+</span>
      </Button>
    </header>

    <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
      {chats.map(chat => (
        <div
          key={chat.id}
          className={cn(
            'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm transition',
            chat.id === activeChatId
              ? 'border-neutral-500/60 bg-neutral-800/60'
              : 'border-transparent hover:border-neutral-700 hover:bg-neutral-800/50'
          )}
        >
          <button
            onClick={() => onSelectChat(chat.id)}
            className="flex-1 text-left"
          >
            <p className="line-clamp-1 font-medium text-neutral-100">{chat.title}</p>
            <p className="text-xs text-neutral-400">{formatDate(chat.updatedAt)}</p>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              if (typeof window !== 'undefined') {
                const confirmed = window.confirm('Delete this chat? This removes all messages in the conversation.');
                if (!confirmed) return;
              }
              onDeleteChat(chat.id);
            }}
            aria-label={`Delete ${chat.title}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {chats.length === 0 && (
        <p className="text-sm text-neutral-400">No chats yet. Start a conversation.</p>
      )}
    </div>

    <footer className="mt-4">
      <Button variant="ghost" className="w-full justify-center" onClick={onReset}>
        Clear browser state
      </Button>
    </footer>
  </aside>
);
