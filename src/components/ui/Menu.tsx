import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from './Button';

export type MenuItem = { id: string; label: string; icon?: ReactNode; onSelect: () => void; disabled?: boolean; danger?: boolean };
export function Menu({ label, items, disabled = false, locale = 'en', align = 'end' }: {
  label: string; items: MenuItem[]; disabled?: boolean; locale?: string; align?: 'start' | 'end';
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open,setOpen] = useState(false);
  const firstIndex = useRef(0);
  const search = useRef({ text: '', time: 0 });
  const close = (restore = true) => { setOpen(false); if (restore) trigger.current?.focus(); };
  useLayoutEffect(() => {
    if (!open) return;
    const controls = list.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)');
    controls?.[firstIndex.current < 0 ? controls.length - 1 : 0]?.focus();
    const place = () => {
      const menu = list.current;
      if (!menu) return;
      menu.style.transform = '';
      const rect = menu.getBoundingClientRect();
      const shift = rect.left < 16 ? 16 - rect.left : rect.right > window.innerWidth - 16 ? window.innerWidth - 16 - rect.right : 0;
      menu.style.transform = `translateX(${shift}px)`;
    };
    place();
    window.addEventListener('resize',place);
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close(false); };
    document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize',place); };
  }, [open]);
  return <div ref={root} className="yada-menu-root">
    <Button ref={trigger} variant="secondary" disabled={disabled} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => { firstIndex.current = 0; setOpen(!open); }}
      onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); firstIndex.current = event.key === 'ArrowUp' ? -1 : 0; setOpen(true); } }}>{label}<ChevronDown size={16} aria-hidden="true" /></Button>
    {open && <div ref={list} id={id} role="menu" aria-label={label} className="yada-menu" data-align={align} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
      if (event.key === 'Tab') { close(); return; }
      const controls = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')];
      const current = controls.indexOf(document.activeElement as HTMLButtonElement);
      let next = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1 : event.key === 'ArrowDown' ? (current + 1) % controls.length : event.key === 'ArrowUp' ? (current - 1 + controls.length) % controls.length : -1;
      if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const now = Date.now(); search.current = { text: now - search.current.time > 700 ? event.key : search.current.text + event.key, time: now };
        const query = search.current.text.toLocaleLowerCase(locale);
        const order = controls.map((_,i) => (current + 1 + i) % controls.length);
        next = order.find(i => controls[i].textContent?.trim().toLocaleLowerCase(locale).startsWith(query)) ?? -1;
      }
      if (next >= 0 && controls.length) { event.preventDefault(); controls[next]?.focus(); }
    }}>
      {items.map(item => <button key={item.id} type="button" role="menuitem" tabIndex={-1} disabled={item.disabled} data-danger={item.danger || undefined} onClick={() => { close(); item.onSelect(); }}>{item.icon}{item.label}</button>)}
    </div>}
  </div>;
}
