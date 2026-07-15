import React from 'react';
import { createPortal } from 'react-dom';
import { Copy, X } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';

interface AiCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiText: string;
  setAiText: (text: string) => void;
}

export const AiCopyModal: React.FC<AiCopyModalProps> = ({ isOpen, onClose, aiText, setAiText }) => {
  const language = useAppStore((s) => s.language);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl h-[70vh] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Copy className="w-4 h-4 text-indigo-500" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              {language === 'tr' ? 'AI İçin Mimari Verisi' : 'Architecture Data for AI'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-650 dark:hover:text-slate-255 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 flex flex-col gap-3 min-h-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'tr' 
              ? 'Aşağıdaki metni inceleyebilir, düzenleyebilir ve kopyalayarak ChatGPT, Claude veya Gemini gibi bir yapay zeka modeline yapıştırabilirsiniz.' 
              : 'You can review, edit, and copy the following text to paste into an AI model like ChatGPT, Claude, or Gemini.'}
          </p>
          <textarea
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            className="w-full flex-1 p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-300 font-mono resize-none overflow-y-auto min-h-0"
          />
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-850 bg-slate-50/30 dark:bg-slate-900/20 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {language === 'tr' ? 'Kapat' : 'Close'}
          </button>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(aiText);
                onClose();
              } catch (err) {
                console.error('Clipboard copy failed:', err);
              }
            }}
            className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-sm hover:scale-[1.01] transition-all cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{language === 'tr' ? 'Kopyala' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
