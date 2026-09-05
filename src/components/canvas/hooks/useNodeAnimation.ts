import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { simulationClock } from '../../../store/simulationClock';

export const useNodeAnimation = (nodeId: string) => {
  const [animState, setAnimState] = useState({
    tooltipActive: false,
    tooltipText: '',
    nodeActive: false,
  });

  const nodeSchedulesRef = useRef<any[]>([]);

  useEffect(() => {
    // Keep a synchronous ref of node schedules to avoid searching on every frame
    const updateNodeSchedules = () => {
      const state = useAppStore.getState();
      nodeSchedulesRef.current = state.derivedNodeSchedules?.[nodeId] || [];
    };

    updateNodeSchedules();

    const unsubStore = useAppStore.subscribe((state, prevState) => {
      if (
        state.logicalData !== prevState.logicalData ||
        state.visualData.timelines !== prevState.visualData.timelines ||
        state.schedules !== prevState.schedules ||
        state.derivedNodeSchedules !== prevState.derivedNodeSchedules
      ) {
        updateNodeSchedules();
        // Recalculate on topology change
        checkAnimState(simulationClock.getTime());
      }
    });

    const checkAnimState = (currentTime: number) => {
      let tooltipActive = false;
      let tooltipText = '';
      let nodeActive = false;

      const mySchedules = nodeSchedulesRef.current;
      if (mySchedules && mySchedules.length > 0) {
        for (let i = 0; i < mySchedules.length; i++) {
          const item = mySchedules[i];
          const ipDuration = (!item.isRoundTrip && item.internalProcess) ? item.internalProcess.duration : 0;
          const activeEnd = item.end + ipDuration;
          if (currentTime < item.start || currentTime > activeEnd) continue;

          const elapsed = currentTime - item.start;
          const stepDuration = item.duration;

          if (item.isRoundTrip) {
            const halfTransit = stepDuration / 2;
            const totalElapsed = item.end - item.start;
            const returnStartElapsed = totalElapsed - halfTransit;

            if (item.isSource) {
              if (elapsed < halfTransit || elapsed >= returnStartElapsed) {
                nodeActive = true;
              }
            }
            if (item.isTarget) {
              if (elapsed >= halfTransit && elapsed < returnStartElapsed) {
                nodeActive = true;
              }
            }

            if (item.isTarget && item.internalProcess) {
              const tooltipStart = item.start + halfTransit;
              const tooltipEnd = tooltipStart + item.internalProcess.duration;
              if (currentTime >= tooltipStart && currentTime < tooltipEnd) {
                tooltipActive = true;
                tooltipText = item.internalProcess.text;
              }
            }
          } else {
            const transitDuration = stepDuration;

            if (item.isSource) {
              if (elapsed < transitDuration) {
                nodeActive = true;
              }
            }
            if (item.isTarget) {
              if (elapsed >= transitDuration) {
                nodeActive = true;
              }
            }

            if (item.isTarget && item.internalProcess) {
              const tooltipStart = item.end;
              const tooltipEnd = item.end + item.internalProcess.duration;
              if (currentTime >= tooltipStart && currentTime < tooltipEnd) {
                tooltipActive = true;
                tooltipText = item.internalProcess.text;
              }
            }
          }
        }
      }

      setAnimState((prev) => {
        if (
          prev.tooltipActive !== tooltipActive ||
          prev.tooltipText !== tooltipText ||
          prev.nodeActive !== nodeActive
        ) {
          return { tooltipActive, tooltipText, nodeActive };
        }
        return prev;
      });
    };

    const unsubClock = simulationClock.subscribe((time) => {
      checkAnimState(time);
    });

    return () => {
      unsubStore();
      unsubClock();
    };
  }, [nodeId]);

  return animState;
};

