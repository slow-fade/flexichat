import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...values: unknown[]) => twMerge(clsx(values));
