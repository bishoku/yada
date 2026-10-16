import { useMemo, useSyncExternalStore } from 'react';

export function useCompactLayout() {
  const media = useMemo(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(max-width: 1023px)') : null, []);
  return useSyncExternalStore(
    callback => { media?.addEventListener('change', callback); return () => media?.removeEventListener('change', callback); },
    () => media?.matches ?? false,
    () => false,
  );
}
