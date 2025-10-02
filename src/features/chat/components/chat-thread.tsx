import { useEffect, useState } from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import { Check, GitBranch, Pencil, RefreshCw, Trash2, X } from 'lucide-react';
import remarkGfm from 'remark-gfm';
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
  pendingMessageId: string | null;
  onCancelPendingMessage: (messageId: string) => void;
};

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
};

const markdownComponents: Components = {
  p: props => (
    <p className="whitespace-pre-wrap leading-relaxed text-neutral-200" {...props} />
  ),
  code: ({ inline, className, ...props }) => {
    if (inline) {
      return (
        <code className={cn('rounded bg-neutral-800 px-1.5 py-0.5 text-sm text-neutral-100', className)} {...props} />
      );
    }
    return (
      <pre className="overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-100">
        <code className={className} {...props} />
      </pre>
    );
  },
  a: props => (
    <a className="text-neutral-100 underline underline-offset-2 hover:text-neutral-50" {...props} />
  ),
  ul: props => <ul className="list-disc space-y-1 pl-5 text-neutral-200" {...props} />,
  ol: props => <ol className="list-decimal space-y-1 pl-5 text-neutral-200" {...props} />,
  li: props => <li className="leading-relaxed text-neutral-200" {...props} />,
  blockquote: props => (
    <blockquote className="border-l-2 border-neutral-700 pl-3 text-neutral-300" {...props} />
  ),
  h1: props => <h1 className="text-xl font-semibold text-neutral-100" {...props} />,
  h2: props => <h2 className="text-lg font-semibold text-neutral-100" {...props} />,
  h3: props => <h3 className="text-base font-semibold text-neutral-100" {...props} />,
  hr: () => <hr className="border-neutral-800" />
};

export const ChatThreadView = ({
  chat,
  onDeleteMessage,
  onEditMessage,
  onCloneFromMessage,
  onRegenerateMessage,
  pendingMessageId,
  onCancelPendingMessage
}: ChatThreadProps) => {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [renderModes, setRenderModes] = useState<Record<string, 'markdown' | 'text'>>({});

  useEffect(() => {
    setEditingMessageId(null);
    setMessageDraft('');
    setRenderModes({});
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

  const toggleRenderMode = (messageId: string) => {
    setRenderModes(previous => {
      const current = previous[messageId] ?? 'markdown';
      const next = current === 'markdown' ? 'text' : 'markdown';
      return { ...previous, [messageId]: next };
    });
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
            const status = message.status ?? 'complete';
            const isPending = status === 'pending';
            const isError = status === 'error';
            const isCancelled = status === 'cancelled';
            const isActivePending = isPending && pendingMessageId === message.id;
            const renderMode = renderModes[message.id] ?? 'markdown';
            const isMarkdown = renderMode === 'markdown';
            const hasContent = message.content.trim().length > 0;
            const showToggle = !isEditingCurrent && !isPending && hasContent;

            const statusLabel =
              status === 'pending'
                ? 'Pending'
                : status === 'error'
                  ? 'Error'
                  : status === 'cancelled'
                    ? 'Cancelled'
                    : null;

            const statusClass =
              status === 'error'
                ? 'border-red-500/50 text-red-300'
                : status === 'cancelled'
                  ? 'border-amber-500/50 text-amber-200'
                  : 'border-neutral-700/60 text-neutral-300';

            return (
              <article
                key={message.id}
                className={cn(
                  'rounded-xl border px-4 py-3 text-sm shadow-sm transition',
                  message.role === 'user'
                    ? 'border-neutral-600/60 bg-neutral-800/60 text-neutral-100'
                    : 'border-neutral-700/70 bg-neutral-900/80 text-neutral-100',
                  isPending && 'border-dashed border-neutral-600',
                  isError && 'border-red-500/50',
                  isCancelled && 'border-amber-500/50'
                )}
              >
                <header className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-neutral-400">
                  <span>{message.role === 'user' ? 'You' : 'Assistant'}</span>
                  <div className="flex items-center gap-1">
                    <time className="text-neutral-400">{formatTimestamp(message.createdAt)}</time>
                    {statusLabel && (
                      <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', statusClass)}>
                        {statusLabel}
                      </span>
                    )}
                    {showToggle && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRenderMode(message.id)}
                        aria-label={`Toggle view mode for message ${message.id}`}
                      >
                        {isMarkdown ? 'MD' : 'TXT'}
                      </Button>
                    )}
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
                          disabled={isPending}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Clone chat from this message"
                          onClick={() => onCloneFromMessage(message.id)}
                          disabled={isPending}
                        >
                          <GitBranch className="h-4 w-4" />
                        </Button>
                        {isLastAssistant && !isPending && (
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
                          disabled={isPending && isActivePending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </header>
                {isPending ? (
                  <div className="space-y-3">
                    <div className="h-4 w-40 animate-pulse rounded bg-neutral-700/70" />
                    <div className="h-4 w-full animate-pulse rounded bg-neutral-700/60" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-neutral-700/50" />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onCancelPendingMessage(message.id)}
                        disabled={!isActivePending}
                      >
                        Abort
                      </Button>
                    </div>
                  </div>
                ) : editingMessageId === message.id ? (
                  <Textarea
                    value={messageDraft}
                    onChange={event => setMessageDraft(event.target.value)}
                    rows={4}
                    className="mt-2"
                  />
                ) : (
                  isMarkdown ? (
                    <div className="space-y-3 text-sm leading-relaxed text-neutral-200">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed text-neutral-200">{message.content}</p>
                  )
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
