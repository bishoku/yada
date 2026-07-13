import React from 'react';
import { getOptimalTickInterval } from './utils';

interface TimelineGridProps {
  maxTime: number;
  pxPerMs: number;
}

export const TimelineGrid: React.FC<TimelineGridProps> = ({ maxTime, pxPerMs }) => {
  const tickInterval = getOptimalTickInterval(pxPerMs);
  const steps = Math.ceil(maxTime / tickInterval);
  return (
    <div 
      className="absolute inset-y-0 left-0 flex pointer-events-none z-10"
      style={{ width: maxTime * pxPerMs }}
    >
      {Array.from({ length: steps }).map((_, i) => (
        <div 
          key={i} 
          className="h-full border-r border-slate-200/30 dark:border-slate-800/5"
          style={{ width: tickInterval * pxPerMs }}
        />
      ))}
    </div>
  );
};
