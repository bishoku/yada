import { useEffect, useRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';

/**
 * Isolated requestAnimationFrame playback loop for the simulation timeline.
 * Handles continuous timestamp increments and loop/stop triggers without causing parent re-render cascades.
 */
export const usePlaybackLoop = (isPlaying: boolean, maxTime: number) => {
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      return;
    }

    let previousTime: number | null = null;

    const tick = (timestamp: number) => {
      if (previousTime !== null) {
        const delta = timestamp - previousTime;
        const state = useAppStore.getState();
        const nextTime = state.currentTime + delta * state.playbackRate;

        if (nextTime >= maxTime) {
          if (state.loopPlayback) {
            state.setCurrentTime(0);
            previousTime = timestamp;
          } else {
            state.stopPlayback();
          }
        } else {
          state.setCurrentTime(nextTime);
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
