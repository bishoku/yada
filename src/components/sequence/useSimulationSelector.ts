import { useCallback, useSyncExternalStore } from 'react';
import { simulationClock } from '../../store/simulationClock';

const subscribe = (notify: () => void) => simulationClock.subscribe(notify);

/** Select a primitive: React only updates when the displayed phase/range changes. */
export function useSimulationSelector<T extends string | number | boolean>(select: (time: number) => T): T {
  const snapshot = useCallback(() => select(simulationClock.getTime()), [select]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
