import * as SelectPrimitive from '@radix-ui/react-select';
import type { SelectContentProps as PrimitiveSelectContentProps } from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { cn } from '../../lib/cn';

export const Select = SelectPrimitive.Root;

export const SelectTrigger = ({
  className,
  children,
  ...props
}: PropsWithChildren<SelectPrimitive.SelectTriggerProps>) => (
  <SelectPrimitive.Trigger
    className={cn(
      'inline-flex w-full items-center justify-between gap-2 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon>
      <ChevronDown className="h-4 w-4 text-neutral-400" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
);

type SelectContentProps = PropsWithChildren<PrimitiveSelectContentProps> & {
  viewportClassName?: string;
};

export const SelectContent = ({
  className,
  children,
  viewportClassName,
  ...props
}: SelectContentProps) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      className={cn(
        'z-50 min-w-[180px] overflow-hidden rounded-md border border-neutral-700 bg-neutral-900 shadow-xl',
        className
      )}
      position="popper"
      {...props}
    >
      <SelectPrimitive.Viewport className={cn('p-1', viewportClassName)}>
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
);

export const SelectItem = ({
  className,
  children,
  ...props
}: PropsWithChildren<SelectPrimitive.SelectItemProps>) => (
  <SelectPrimitive.Item
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm text-neutral-100 outline-none focus:bg-neutral-800/80',
      className
    )}
    {...props}
  >
    <SelectPrimitive.ItemIndicator>
      <Check className="h-4 w-4" />
    </SelectPrimitive.ItemIndicator>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
);

export const SelectValue = SelectPrimitive.Value;
