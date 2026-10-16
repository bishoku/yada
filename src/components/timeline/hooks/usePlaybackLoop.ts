import { useEffect } from 'react';
import { simulationClock } from '../../../store/simulationClock';
import { startSimulationLoop } from '../../../store/playbackLoop';

export const usePlaybackLoop = (isPlaying: boolean, maxTime: number, loop?: boolean) => {
  useEffect(() => {
    simulationClock.setIsPlaying(isPlaying);
    if (isPlaying) return startSimulationLoop(maxTime, undefined, { loop });
  }, [isPlaying, maxTime, loop]);
};
