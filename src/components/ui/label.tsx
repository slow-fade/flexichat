import type { LabelHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export const Label = ({ className, ...props }: LabelProps) => (
  <label className={cn('text-sm font-medium text-neutral-200', className)} {...props} />
);
