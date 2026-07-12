import React from 'react';
import { Clock, X, Save } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

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
  const theme = useAppStore((state) => state.theme);

  if (!pendingConnection) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="w-[380px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            {theme === 'dark' ? 'Adım Sırası Belirle' : 'Set Step Order'}
          </span>
          <button 
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 animate-none cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-455 leading-relaxed font-sans">
          {theme === 'dark' ? (
            <>
              <span className="font-bold text-slate-700 dark:text-slate-200">{connectionSrcName}</span> bileşeninden{" "}
              <span className="font-bold text-slate-700 dark:text-slate-200">{connectionDstName}</span> bileşenine çizdiğiniz bağlantının çalıştırılma sırasını girin.
            </>
          ) : (
            <>
              Enter the execution step order for the link between{" "}
              <span className="font-bold text-slate-700 dark:text-slate-200">{connectionSrcName}</span> and{" "}
              <span className="font-bold text-slate-700 dark:text-slate-200">{connectionDstName}</span>.
            </>
          )}
        </div>

        <div className="flex flex-col gap-1.5 font-sans">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {theme === 'dark' ? 'Adım Numarası (Sıra)' : 'Step Number (Order)'}
          </label>
          <input
            type="number"
            min="1"
            max="99"
            value={stepOrderVal}
            onChange={(e) => setStepOrderVal(Math.max(1, Number(e.target.value)))}
            className="px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-600 w-full font-bold"
          />
        </div>

        <div className="flex gap-2 justify-end mt-2 font-sans">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-2xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {theme === 'dark' ? 'İptal' : 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{theme === 'dark' ? 'Kaydet' : 'Save'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
