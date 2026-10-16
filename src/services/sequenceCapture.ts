import { flushSync } from 'react-dom';

let captures = 0;
let restorers: Array<() => Promise<unknown>> = [];
const listeners = new Set<() => void>();
export const subscribeSequenceCapture = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const isFullSequenceCapture = () => captures > 0;
function changeCaptures(delta: number) {
  // DOM capture must see the complete message layer before cloning the viewport.
  flushSync(() => { captures += delta; for (const listener of listeners) listener(); });
}
/** Reference counting keeps overlapping captures complete and restores culling on errors. */
export async function withFullSequenceRendering<T>(capture: () => Promise<T>): Promise<T> {
  if (!captures && typeof window !== 'undefined') {
    restorers = [];
    window.dispatchEvent(new CustomEvent('export:rememberview', { detail: restorers }));
  }
  changeCaptures(1);
  try {
    if (typeof requestAnimationFrame === 'function') await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return await capture();
  } finally {
    try {
      if (captures === 1) {
        const restore = restorers; restorers = [];
        await Promise.allSettled(restore.map(callback => callback()));
      }
    } finally { changeCaptures(-1); }
  }
}
