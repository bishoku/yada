import React, { memo } from 'react';
import { Clock } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { translations } from '../../../i18n/translations';

export const TimelineEmptyState: React.FC = memo(() => {
  const language = useAppStore((s) => s.language);
  const t = translations[language];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
      <Clock className="w-8 h-8 text-slate-350 dark:text-slate-650 stroke-[1.5] mb-2" />
      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-450">
        {t.noAnimationSteps}
      </span>
      <p className="text-[9px] text-slate-400 dark:text-slate-550 max-w-[200px] mt-1 leading-normal">
        {t.drawConnectionPrompt}
      </p>
    </div>
  );
});

TimelineEmptyState.displayName = 'TimelineEmptyState';
