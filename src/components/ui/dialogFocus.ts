import type { KeyboardEvent } from 'react';

/** Match the browser's Tab order, including disabled fieldsets and nested dialogs. */
export function containDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.defaultPrevented || event.key !== 'Tab' || (event.target as Element).closest('dialog') !== event.currentTarget) return;
  const dialog = event.currentTarget;
  const controls = [...dialog.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select, summary, [tabindex], [contenteditable="true"]')]
    .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && !element.closest('[inert]') && element.closest('dialog') === dialog && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
  const first = controls[0], last = controls[controls.length - 1];
  if (!first) { event.preventDefault(); dialog.focus(); return; }
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
