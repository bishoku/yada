import { useId, useRef, type ReactNode } from 'react';

export function Tabs({ label, items, value, onChange, className = '', panelClassName = '' }: {
  label: string; items: { id: string; label: string; content: ReactNode; disabled?: boolean }[];
  value: string; onChange: (id: string) => void; className?: string; panelClassName?: string;
}) {
  const prefix = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return <div className={`yada-tabs ${className}`}>
    <div role="tablist" aria-label={label} className="yada-tab-list" onKeyDown={event => {
      const enabled = items.map((item,index) => !item.disabled ? index : -1).filter(index => index >= 0);
      const current = enabled.indexOf(items.findIndex(item => item.id === value));
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 : event.key === 'ArrowRight' ? (current + 1) % enabled.length : event.key === 'ArrowLeft' ? (current - 1 + enabled.length) % enabled.length : -1;
      if (target < 0 || !enabled.length) return;
      event.preventDefault(); const index = enabled[target]; onChange(items[index].id); refs.current[index]?.focus();
    }}>
      {items.map((item,index) => <button key={item.id} ref={element => { refs.current[index] = element; }} type="button" role="tab" id={`${prefix}-tab-${item.id}`} aria-controls={`${prefix}-panel-${item.id}`} aria-selected={value === item.id} tabIndex={value === item.id ? 0 : -1} disabled={item.disabled} onClick={() => onChange(item.id)}>{item.label}</button>)}
    </div>
    {items.map(item => <div key={item.id} role="tabpanel" id={`${prefix}-panel-${item.id}`} aria-labelledby={`${prefix}-tab-${item.id}`} hidden={value !== item.id} className={panelClassName}>{value === item.id && item.content}</div>)}
  </div>;
}
