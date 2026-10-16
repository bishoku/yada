import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import { IconButton } from './IconButton';

export function Toast({ children, onDismiss, action, variant = 'success' }: {
  children: ReactNode; onDismiss: () => void; action?: ReactNode; variant?: 'success' | 'error';
}) {
  const t = useTranslation();
  return <div className="yada-toast" data-variant={variant}>
    <div role={variant === 'error' ? 'alert' : 'status'} className="min-w-0 flex-1">{children}</div>
    {action}<IconButton label={t.close} onClick={onDismiss}><X size={16} aria-hidden="true" /></IconButton>
  </div>;
}
