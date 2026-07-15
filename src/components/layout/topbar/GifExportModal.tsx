import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FileDown, Check } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { translations } from '../../../i18n/translations';

interface GifExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (fps: number, quality: number) => void;
}

export const GifExportModal: React.FC<GifExportModalProps> = ({ isOpen, onClose, onExport }) => {
  const language = useAppStore((s) => s.language);
  const t = translations[language];

  const [gifFps, setGifFps] = useState(15);
  const [gifQuality, setGifQuality] = useState(80);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <FileDown className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          {language === 'tr' ? 'GIF Dışa Aktarma Seçenekleri' : 'GIF Export Configuration'}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              <span>{language === 'tr' ? 'FPS (Saniye Başına Kare)' : 'FPS (Frames Per Second)'}</span>
              <span className="text-indigo-500">{gifFps}</span>
            </label>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={gifFps}
              onChange={(e) => setGifFps(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <div>
            <label className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              <span>{language === 'tr' ? 'Kalite' : 'Quality'}</span>
              <span className="text-indigo-500">%{gifQuality}</span>
            </label>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={gifQuality}
              onChange={(e) => setGifQuality(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              {language === 'tr'
                ? 'Yüksek kalite renkleri daha iyi korur ancak işlem süresini uzatır.'
                : 'Higher quality preserves colors better but takes longer to encode.'}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={() => {
                onExport(gifFps, gifQuality);
                onClose();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-semibold rounded-xl text-xs cursor-pointer flex items-center gap-1 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              {language === 'tr' ? 'Oluştur' : 'Generate'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
