import { cloneElement, useId, useState, useRef, useLayoutEffect, type ReactElement, type AriaAttributes } from 'react';

export function Tooltip({ label, children }: { label: string; children: ReactElement<AriaAttributes> }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const surface = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = surface.current;
    if (!open || !element) return;
    const box = element.getBoundingClientRect();
    const shift = box.left < 8 ? 8 - box.left : box.right > innerWidth - 8 ? innerWidth - 8 - box.right : 0;
    element.style.transform = `translateX(calc(-50% + ${shift}px))`;
    if (box.bottom > innerHeight - 8) { element.style.top = 'auto'; element.style.bottom = 'calc(100% + 0.5rem)'; }
  }, [open]);
  return <span className="yada-tooltip-anchor" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
    onKeyDown={event => { if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); } }}>
    {cloneElement(children, { 'aria-describedby': open ? [children.props['aria-describedby'], id].filter(Boolean).join(' ') : children.props['aria-describedby'] })}
    {open && <span ref={surface} id={id} role="tooltip" className="yada-tooltip">{label}</span>}
  </span>;
}
