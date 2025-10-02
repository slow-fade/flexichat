import { FormEvent, KeyboardEvent, useState } from 'react';
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
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        <Textarea
          placeholder="Send a message..."
          value={value}
          onChange={event => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={disabled || value.trim().length === 0}>
            Send
          </Button>
        </div>
      </div>
    </form>
  );
};
