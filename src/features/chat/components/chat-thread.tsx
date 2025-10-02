import { useEffect, useState } from 'react';
import { Check, GitBranch, Pencil, RefreshCw, Trash2, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { cn } from '../../../lib/cn';
import type { ChatThread } from '../types';

type ChatThreadProps = {
  chat: ChatThread | null;
  onDeleteMessage: (messageId: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onCloneFromMessage: (messageId: string) => void;
  onRegenerateMessage: (messageId: string) => void;
};

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const ChatThreadView = ({
  chat,
  onDeleteMessage,
  onEditMessage,
  onCloneFromMessage,
  onRegenerateMessage
}: ChatThreadProps) => {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState('');

  useEffect(() => {
    setEditingMessageId(null);
    setMessageDraft('');
  }, [chat?.id]);

  const startEditingMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setMessageDraft(content);
  };

  const handleSaveMessage = (messageId: string) => {
    const trimmed = messageDraft.trim();
    if (!trimmed) return;
    onEditMessage(messageId, trimmed);
    setEditingMessageId(null);
    setMessageDraft('');
  };

  const handleCancelMessageEdit = () => {
    setEditingMessageId(null);
    setMessageDraft('');
  };

  if (!chat) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center text-neutral-400">
        <h2 className="text-2xl font-semibold text-neutral-100">No chat selected</h2>
        <p className="mt-2 max-w-sm text-sm">
          Start a new chat or pick an existing session from the sidebar to continue your conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <section className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {chat.messages.map(message => {
            const isLastMessage = chat.messages[chat.messages.length - 1]?.id === message.id;
            const isLastAssistant = isLastMessage && message.role === 'assistant';
            const isEditingCurrent = editingMessageId === message.id;

            return (
              <article
                key={message.id}
                className={cn(
                  'rounded-xl border px-4 py-3 text-sm shadow-sm',
                  message.role === 'user'
                    ? 'border-neutral-600/60 bg-neutral-800/60 text-neutral-100'
                    : 'border-neutral-700/70 bg-neutral-900/80 text-neutral-100'
                )}
              >
                <header className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-neutral-400">
                  <span>{message.role === 'user' ? 'You' : 'Assistant'}</span>
                  <div className="flex items-center gap-1">
                    <time className="text-neutral-400">{formatTimestamp(message.createdAt)}</time>
                    {isEditingCurrent ? (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          aria-label="Save message"
                          onClick={() => handleSaveMessage(message.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Cancel editing"
                          onClick={handleCancelMessageEdit}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Edit message"
                          onClick={() => startEditingMessage(message.id, message.content)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Clone chat from this message"
                          onClick={() => onCloneFromMessage(message.id)}
                        >
                          <GitBranch className="h-4 w-4" />
                        </Button>
                        {isLastAssistant && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Regenerate assistant reply"
                            onClick={() => onRegenerateMessage(message.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Delete message"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              const confirmed = window.confirm('Delete this message?');
                              if (!confirmed) return;
                            }
                            onDeleteMessage(message.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </header>
                {editingMessageId === message.id ? (
                  <Textarea
                    value={messageDraft}
                    onChange={event => setMessageDraft(event.target.value)}
                    rows={4}
                    className="mt-2"
                  />
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed text-neutral-200">{message.content}</p>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
