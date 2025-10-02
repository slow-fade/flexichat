import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full min-h-[120px] rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500',
      className
    )}
    {...props}
  />
));

Textarea.displayName = 'Textarea';
