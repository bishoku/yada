import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent',
  secondary: 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700',
  ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-transparent',
  danger: 'bg-rose-600 hover:bg-rose-500 text-white border-transparent',
};
export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants; busy?: boolean }>(function Button({ variant = 'primary', busy = false, disabled, children, className = '', type = 'button', autoFocus = false, ...props }, ref) {
  return <button ref={ref} type={type} autoFocus={autoFocus} disabled={disabled || busy} aria-busy={busy || undefined} data-dialog-autofocus={autoFocus ? '' : undefined} data-variant={variant} className={`yada-button ${variants[variant]} ${className}`} {...props}>
    {busy && <Loader2 size={16} className="animate-spin shrink-0" aria-hidden="true" />}{children}
  </button>;
});
