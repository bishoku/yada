import React from 'react';

interface TimelineRulerProps {
  maxTime: number;
  pxPerMs: number;
}

export const TimelineRuler: React.FC<TimelineRulerProps> = ({ maxTime, pxPerMs }) => {
  const steps = Math.ceil(maxTime / 200);
  return (
    <div className="h-6 relative border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900 flex items-center">
      <div className="absolute inset-y-0 left-0 flex" style={{ width: maxTime * pxPerMs }}>
        {Array.from({ length: steps }).map((_, i) => {
          const ms = i * 200;
          return (
            <div 
              key={ms} 
              className="h-full border-r border-slate-200/50 dark:border-slate-800/10 flex items-center shrink-0"
              style={{ width: 200 * pxPerMs }}
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
