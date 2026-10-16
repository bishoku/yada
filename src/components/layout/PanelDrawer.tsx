import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { ModalSurface } from '../ui/ModalSurface';
import { useTranslation } from '../../i18n/useTranslation';

export type CompactPanel = 'library' | 'properties' | 'timeline';

export function PanelDrawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const t = useTranslation();
  return <ModalSurface label={title} onClose={onClose} width="30rem" className="yada-drawer">
    <section className="h-full flex flex-col bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-4 py-1.5 shrink-0">
        <h2 className="text-base font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label={t.close} className="yada-icon-button hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
      </header>
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{children}</div>
    </section>
  </ModalSurface>;
}
