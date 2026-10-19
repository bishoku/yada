import { containDialogFocus } from './dialogFocus';
import { useLayoutEffect, useRef, type ReactNode } from 'react';


/** Shared lifecycle for dialogs with custom content, including nested dialogs. */
export function ModalSurface({ label, onClose, children, width = '36rem', fullscreen = false, dismissible = true, className = '' }: {
  label: string; onClose: () => void; children: ReactNode; width?: string; fullscreen?: boolean; dismissible?: boolean; className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
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
  return <dialog ref={ref} aria-label={label} aria-modal="true" className={`yada-modal ${fullscreen ? 'yada-modal-fullscreen' : ''} ${className}`}
    style={{ width: fullscreen ? '100vw' : `min(${width}, calc(100vw - 2rem))` }}
    onCancel={event => { event.preventDefault(); if (dismissible) onClose(); }}
    onKeyDown={event => {
      if (event.defaultPrevented || (event.target as Element).closest('dialog') !== event.currentTarget) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (dismissible) onClose(); return; }
      containDialogFocus(event);
    }}>
    {children}
  </dialog>;
}
