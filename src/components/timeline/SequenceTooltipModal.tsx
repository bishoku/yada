import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';

interface SequenceTooltipModalProps {
  seqId: string;
  onClose: () => void;
}

/**
 * Modal dialog for configuring sequence internal process tooltips and display durations.
 */
export const SequenceTooltipModal: React.FC<SequenceTooltipModalProps> = ({ seqId, onClose }) => {
  const visualData = useAppStore((s) => s.visualData);
  const updateSequenceProcess = useAppStore((s) => s.updateSequenceProcess);
  const language = useAppStore((s) => s.language);
  const t = translations[language];

  const timing = visualData.timelines[seqId];
  const [tooltipText, setTooltipText] = useState(timing?.internalProcess?.text ?? '');
  const [tooltipDuration, setTooltipDuration] = useState(timing?.internalProcess?.duration ?? 1000);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = () => {
    updateSequenceProcess(seqId, tooltipText, tooltipDuration);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="w-[380px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {t.configureNodeTooltip}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {t.tooltipText}
            </label>
            <input
              type="text"
              placeholder={language === 'tr' ? 'örn: Veri Kaydediliyor...' : 'e.g., Saving Data...'}
              value={tooltipText}
              onChange={(e) => setTooltipText(e.target.value)}
              className="px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-650 text-slate-800 dark:text-slate-200"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {t.displayDurationMs}
            </label>
            <input
              type="number"
              value={tooltipDuration}
              onChange={(e) => setTooltipDuration(Number(e.target.value))}
              className="px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-650 text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-2xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t.save}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
