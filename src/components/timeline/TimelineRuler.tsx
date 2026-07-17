import React from 'react';
import { getOptimalTickInterval } from './utils';

interface TimelineRulerProps {
  maxTime: number;
  pxPerMs: number;
}

export const TimelineRuler: React.FC<TimelineRulerProps> = ({ maxTime, pxPerMs }) => {
  const tickInterval = getOptimalTickInterval(pxPerMs);
  const steps = Math.ceil(maxTime / tickInterval);
  return (
    <div className="h-6 sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900 flex items-center">
      <div className="absolute inset-y-0 left-0 flex" style={{ width: maxTime * pxPerMs }}>
        {Array.from({ length: steps }).map((_, i) => {
          const ms = i * tickInterval;
          return (
            <div 
              key={ms} 
              className="h-full border-r border-slate-200/50 dark:border-slate-800/10 flex items-center shrink-0"
              style={{ width: tickInterval * pxPerMs }}
            >
              <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 pl-1 font-extrabold">
                {ms}ms
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
