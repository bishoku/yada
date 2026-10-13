import { useEffect, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { simulationClock } from '../../../store/simulationClock';
import { buildSectionIntervals, sectionActiveAt } from './sectionPlayback';

export const useSectionAnimation = (sectionId: string) => {
  const [isActive, setIsActive] = useState(false);
  useEffect(() => {
    let intervals = buildSectionIntervals(sectionId, useAppStore.getState().logicalData, useAppStore.getState().schedules);
    let previous: boolean | undefined;
    const update = (time: number) => {
      const active = sectionActiveAt(intervals, time);
      if (active !== previous) { previous = active; setIsActive(active); }
    };
    const unsubscribeStore = useAppStore.subscribe((state, previousState) => {
      if (state.logicalData.nodes !== previousState.logicalData.nodes || state.logicalData.edges !== previousState.logicalData.edges || state.logicalData.sequences !== previousState.logicalData.sequences || state.schedules !== previousState.schedules) {
        intervals = buildSectionIntervals(sectionId, state.logicalData, state.schedules);
        update(simulationClock.getTime());
      }
    });
    const unsubscribeClock = simulationClock.subscribe(update);
    return () => { unsubscribeStore(); unsubscribeClock(); };
  }, [sectionId]);
  return isActive;
};
