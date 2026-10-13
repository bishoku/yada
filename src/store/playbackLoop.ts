import { useAppStore } from './useAppStore';
import { simulationClock } from './simulationClock';
import { activeSequencesAt } from './playbackModel';
interface FrameDriver { request(callback: FrameRequestCallback): number; cancel(id: number): void }
/** Shared by editor and embedded playback: clock every frame, store at most every 150ms. */
export function startSimulationLoop(maxTime: number, driver: FrameDriver = { request: callback => requestAnimationFrame(callback), cancel: id => cancelAnimationFrame(id) }) {
  let disposed = false;
  let frame: number | null = null;
  let previous: number | null = null;
  let lastStoreSync = 0;
  const tick = (timestamp: number) => {
    if (disposed || !useAppStore.getState().isPlaying) return;
    if (previous !== null) {
      const state = useAppStore.getState();
      const next = simulationClock.getTime() + (timestamp - previous) * state.playbackRate;
      if (next >= maxTime) {
        if (!state.loopPlayback) { state.stopPlayback(); return; }
        state.setCurrentTime(0); // Reset active IDs as well as the clock/playhead.
        lastStoreSync = timestamp;
      } else {
        simulationClock.setTime(next);
        if (timestamp - lastStoreSync > 150) {
          lastStoreSync = timestamp;
          useAppStore.setState({ currentTime: next, activeSequenceIds: activeSequencesAt(state.schedules, next) });
        }
      }
    }
    previous = timestamp;
    frame = driver.request(tick);
  };
  frame = driver.request(tick);
  return () => { disposed = true; if (frame !== null) driver.cancel(frame); };
}
