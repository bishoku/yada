import { flushSync } from 'react-dom';
import { useSyncExternalStore } from 'react';
let captures = 0;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const useAnimatedCapture = () => useSyncExternalStore(subscribe, () => captures > 0, () => false);
export async function withAnimatedCapture<T>(capture: () => Promise<T>): Promise<T> {
  const change = (delta: number) => flushSync(() => { captures += delta; listeners.forEach(listener => listener()); });
  change(1);
  try { return await capture(); }
  finally { change(-1); }
}
