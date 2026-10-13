import { useEffect } from 'react';
import { simulationClock } from '../../../store/simulationClock';
import { startSimulationLoop } from '../../../store/playbackLoop';

export const usePlaybackLoop = (isPlaying: boolean, maxTime: number) => {
  useEffect(() => {
    simulationClock.setIsPlaying(isPlaying);
    if (isPlaying) return startSimulationLoop(maxTime);
  }, [isPlaying, maxTime]);
};
