import { useId } from 'react';
import { message } from '../../i18n/messages';
import { ModalSurface } from '../ui/ModalSurface';
import React from 'react';
import { createPortal } from 'react-dom';
import { Clock, X, Save } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';

interface ConnectionConfirmModalProps {
  pendingConnection: any;
  stepOrderVal: number;
  setStepOrderVal: (val: number) => void;
  connectionSrcName: string;
  connectionDstName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConnectionConfirmModal: React.FC<ConnectionConfirmModalProps> = ({
  pendingConnection,
  stepOrderVal,
  setStepOrderVal,
  connectionSrcName,
  connectionDstName,
  onConfirm,
  onCancel,
}) => {
  const fieldPrefix = useId();
  const language = useAppStore((state) => state.language);
  const t = translations[language];



  if (!pendingConnection) return null;


  return createPortal(
    <ModalSurface label={t.setStepOrder} onClose={onCancel} width="36rem">
      <div className="w-[380px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            {t.setStepOrder}
          </span>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 animate-none cursor-pointer"
           aria-label={message(language, "common.close")}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-slate-550 dark:text-slate-455 leading-relaxed font-sans">
          {message(language, 'ConnectionConfirmModal.executionOrder', { source: connectionSrcName, target: connectionDstName })}
        </div>

        <div className="flex flex-col gap-1.5 font-sans">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider" htmlFor={`${fieldPrefix}-modal-field-1`}>
            {t.stepNumberOrder}
          </label>
          <input
            type="number"
            min="1"
            max="99"
            value={stepOrderVal}
            onChange={(e) => setStepOrderVal(Math.max(1, Number(e.target.value)))}
            className="px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-600 w-full font-bold"
           id={`${fieldPrefix}-modal-field-1`}/>
        </div>

        <div className="flex gap-2 justify-end mt-2 font-sans">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-2xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
           data-dialog-autofocus="">
            {t.cancel}
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t.save}</span>
          </button>
        </div>
      </div>
    </ModalSurface>,
    document.body
  );
};
