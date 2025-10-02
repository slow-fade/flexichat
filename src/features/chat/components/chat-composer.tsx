import { FormEvent, KeyboardEvent, useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';

type ChatComposerProps = {
  onSend: (message: string) => void;
  disabled?: boolean;
};

export const ChatComposer = ({ onSend, disabled }: ChatComposerProps) => {
  const [value, setValue] = useState('');

  const submitMessage = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submitMessage();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submitMessage();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-neutral-800 bg-neutral-950/60 px-8 py-5">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-neutral-700 bg-neutral-900/70 px-4 py-3">
          <div className="flex items-end gap-3">
            <Textarea
              placeholder="Send a message..."
              value={value}
              onChange={event => setValue(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              className="min-h-[120px] flex-1 resize-none border-0 bg-transparent px-0 py-0 text-base text-neutral-100 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-0"
            />
            <Button
              type="submit"
              size="icon"
              variant="secondary"
              disabled={disabled || value.trim().length === 0}
              className="shrink-0"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};
