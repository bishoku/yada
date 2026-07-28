import { useEffect, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';

export const useSectionAnimation = (sectionId: string) => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const unsub = useAppStore.subscribe((state, prevState) => {
      const currentTime = state.currentTime;
      if (currentTime === prevState.currentTime && 
          state.logicalData === prevState.logicalData && 
          state.schedules === prevState.schedules) {
        return;
      }

      let active = false;
      try {
        const { schedules, logicalData: { nodes, edges, sequences } } = state;
        
        const getDescendantNodeIds = (parentId: string, result = new Set<string>()): Set<string> => {
          const children = nodes.filter((n: any) => n.parentId === parentId);
          for (const child of children) {
            result.add(child.id);
            getDescendantNodeIds(child.id, result);
          }
          return result;
        };

        const descendantIds = getDescendantNodeIds(sectionId);

        const relevantEdgeIds = new Set(
          edges
            .filter((e: any) => descendantIds.has(e.sourceId) || descendantIds.has(e.targetId))
            .map((e: any) => e.id)
        );

        for (const seq of sequences) {
          if (relevantEdgeIds.has(seq.edgeId)) {
            const sched = schedules[seq.id];
            if (sched && currentTime >= sched.start && currentTime < sched.end) {
              active = true;
              break;
            }
          }
        }
      } catch (err) {
        // Silently handle errors
      }

      setIsActive((prev) => {
        if (prev !== active) return active;
        return prev;
      });
    });

    return unsub;
  }, [sectionId]);

  return isActive;
};
