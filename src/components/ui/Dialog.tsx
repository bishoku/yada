import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';

/** Native modal behavior makes background content inert and confines keyboard focus. */
export function Dialog({ title, description, children, onClose, role = 'dialog' }: {
  title: string; description?: ReactNode; children: ReactNode; onClose: () => void; role?: 'dialog' | 'alertdialog';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const t = useTranslation();
  useLayoutEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current!;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-dialog-autofocus]')?.focus();
    return () => {
      dialog.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return <dialog ref={ref} role={role} aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}
    className="yada-dialog bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700"
    onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); return; }
      if (event.key !== 'Tab') return;
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])')]
        .filter(element => element.getClientRects().length > 0 && !element.closest('[inert]'));
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="flex items-start justify-between gap-4 mb-5">
      <h2 id={titleId} className="text-lg font-semibold leading-snug">{title}</h2>
      <button type="button" onClick={onClose} aria-label={t.close} className="yada-icon-button text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
        <X size={18} aria-hidden="true" />
      </button>
    </header>
    {description && <div id={descriptionId} className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 break-words">{description}</div>}
    {children}
  </dialog>;
}
