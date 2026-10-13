import { flushSync } from 'react-dom';

let captures = 0;
const listeners = new Set<() => void>();
export const subscribeSequenceCapture = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const isFullSequenceCapture = () => captures > 0;
function changeCaptures(delta: number) {
  // DOM capture must see the complete message layer before cloning the viewport.
  flushSync(() => { captures += delta; for (const listener of listeners) listener(); });
}
/** Reference counting keeps overlapping captures complete and restores culling on errors. */
export async function withFullSequenceRendering<T>(capture: () => Promise<T>): Promise<T> {
  changeCaptures(1);
  try {
    if (typeof requestAnimationFrame === 'function') await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return await capture();
  } finally {
    changeCaptures(-1);
  }
}
