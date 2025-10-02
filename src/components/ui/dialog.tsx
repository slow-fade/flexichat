import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { PropsWithChildren } from 'react';
import { cn } from '../../lib/cn';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogContent = ({
  className,
  children,
  ...props
}: PropsWithChildren<DialogPrimitive.DialogContentProps>) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
    <DialogPrimitive.Content
      className={cn(
        'fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-xl focus:outline-none',
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
);

export const DialogHeader = ({
  className,
  ...props
}: PropsWithChildren<DialogPrimitive.DialogTitleProps>) => (
  <DialogPrimitive.Title className={cn('text-lg font-semibold text-neutral-100', className)} {...props} />
);

export const DialogDescription = ({
  className,
  ...props
}: PropsWithChildren<DialogPrimitive.DialogDescriptionProps>) => (
  <DialogPrimitive.Description className={cn('mt-2 text-sm text-neutral-300', className)} {...props} />
);
