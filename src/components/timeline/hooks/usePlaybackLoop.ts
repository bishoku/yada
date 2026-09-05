import { useEffect, useRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { simulationClock } from '../../../store/simulationClock';

/**
 * Isolated requestAnimationFrame playback loop for the simulation timeline.
 * Drives the high-frequency simulationClock directly at 60-120fps,
 * and throttles updates to the global Zustand store to eliminate re-render cascades.
 */
export const usePlaybackLoop = (isPlaying: boolean, maxTime: number) => {
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      simulationClock.setIsPlaying(false);
      return;
    }

    simulationClock.setIsPlaying(true);
    let previousTime: number | null = null;
    let lastStoreSync = 0;

    const tick = (timestamp: number) => {
      if (previousTime !== null) {
        const delta = timestamp - previousTime;
        const state = useAppStore.getState();
        const currentClockTime = simulationClock.getTime();
        const nextTime = currentClockTime + delta * state.playbackRate;

        if (nextTime >= maxTime) {
          if (state.loopPlayback) {
            simulationClock.setTime(0);
            useAppStore.setState({ currentTime: 0 });
            previousTime = timestamp;
          } else {
            state.stopPlayback();
            return;
          }
        } else {
          simulationClock.setTime(nextTime);

          // Throttled sync to Zustand store (approx 6-7 fps) to avoid re-render storms
          if (timestamp - lastStoreSync > 150) {
            lastStoreSync = timestamp;
            const schedules = state.schedules;
            const nextActiveSeqs: string[] = [];
            for (const seqId in schedules) {
              const sched = schedules[seqId];
              if (nextTime >= sched.start && nextTime < sched.end) {
                nextActiveSeqs.push(seqId);
              }
            }
            useAppStore.setState({
              currentTime: nextTime,
              activeSequenceIds: nextActiveSeqs,
            });
          }
        }
      }

      previousTime = timestamp;
      requestRef.current = requestAnimationFrame(tick);
    };

    requestRef.current = requestAnimationFrame(tick);

    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [isPlaying, maxTime]);
};

