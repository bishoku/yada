import type { ButtonHTMLAttributes } from 'react';
import { Tooltip } from './Tooltip';

export function IconButton({ label, className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <Tooltip label={label}><button type={type} aria-label={label} className={`yada-icon-button ${className}`} {...props} /></Tooltip>;
}
