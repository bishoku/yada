import React from 'react';
import { useAppStore } from '../../store/useAppStore';

interface ScrubLineProps {
  pxPerMs: number;
  isPlaying: boolean;
  isScrubbing: boolean;
  playheadRef: React.RefObject<HTMLDivElement | null>;
}

export const ScrubLine: React.FC<ScrubLineProps> = ({
  pxPerMs,
  isPlaying,
  isScrubbing,
  playheadRef,
}) => {
  const currentTime = useAppStore((state) => state.currentTime);
  return (
    <div 
      ref={playheadRef}
      className="absolute top-0 bottom-0 w-0.5 bg-rose-500/80 pointer-events-none z-40"
      style={{ 
        left: currentTime * pxPerMs,
        transition: (isPlaying || isScrubbing) ? 'none' : 'left 0.1s ease-out'
      }}
    >
      <div className="w-2.5 h-2.5 bg-rose-500 rounded-full absolute -top-1 -left-1 shadow-md shadow-rose-500/50" />
    </div>
  );
};
