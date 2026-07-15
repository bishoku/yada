import React, { useState, useRef, useEffect } from 'react';
import { Grid, Palette } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';

export const CanvasBgSelector: React.FC = () => {
  const language = useAppStore((s) => s.language);
  const gridVisible = useAppStore((s) => s.visualData.canvas.gridVisible !== false);
  const canvasBgColor = useAppStore((s) => s.visualData.canvas.bgColor || '');
  const setGridVisible = useAppStore((s) => s.setGridVisible);
  const setCanvasBgColor = useAppStore((s) => s.setCanvasBgColor);

  const [showBgMenu, setShowBgMenu] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (showBgMenu && popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowBgMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showBgMenu]);

  return (
    <>
      <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1 shrink-0" />

      <button
        onClick={() => setGridVisible(!gridVisible)}
        className={`p-1.5 rounded cursor-pointer transition-colors ${
          gridVisible
            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10'
            : 'text-slate-400 hover:bg-slate-100 dark:text-slate-550 dark:hover:bg-slate-800'
        }`}
        title={
          language === 'tr'
            ? gridVisible
              ? 'Gridi Gizle (Izgarasız)'
              : 'Gridi Göster (Noktalı)'
            : gridVisible
            ? 'Hide Grid (Gridless)'
            : 'Show Grid (Dotted)'
        }
      >
        <Grid className="w-4 h-4" />
      </button>

      <div className="relative" ref={popoverRef}>
        <button
          onClick={() => setShowBgMenu(!showBgMenu)}
          className={`p-1.5 rounded cursor-pointer transition-colors relative ${
            showBgMenu || canvasBgColor
              ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10'
              : 'text-slate-400 hover:bg-slate-100 dark:text-slate-550 dark:hover:bg-slate-800'
          }`}
          title={language === 'tr' ? 'Arka plan rengi seç' : 'Choose background color'}
        >
          <Palette className="w-4 h-4" />
          {canvasBgColor && (
            <span
              className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full border border-white dark:border-slate-900"
              style={{ backgroundColor: canvasBgColor }}
            />
          )}
        </button>

        {showBgMenu && (
          <div className="absolute left-0 mt-1.5 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 p-3 flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {language === 'tr' ? 'Tuval Arka Planı' : 'Canvas Background'}
            </span>

            <div className="grid grid-cols-5 gap-1.5">
              <button
                onClick={() => {
                  setCanvasBgColor(null);
                  setShowBgMenu(false);
                }}
                className={`w-6 h-6 rounded-full border flex items-center justify-center cursor-pointer transition-all hover:scale-115 ${
                  !canvasBgColor
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-transparent'
                }`}
                title={language === 'tr' ? 'Varsayılan Tema' : 'Default Theme'}
              >
                <span className="text-[9px] font-semibold text-slate-400">×</span>
              </button>

              {[
                '#ffffff',
                '#fdfbf7',
                '#f1f5f9',
                '#f0fdf4',
                '#1e293b',
                '#0f172a',
                '#1e1b4b',
                '#020617',
              ].map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    setCanvasBgColor(color);
                    setShowBgMenu(false);
                  }}
                  className={`w-6 h-6 rounded-full border cursor-pointer transition-all hover:scale-115 ${
                    canvasBgColor === color
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                      : 'border-slate-250 dark:border-slate-700'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                {language === 'tr' ? 'Özel Renk:' : 'Custom Color:'}
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={canvasBgColor || '#ffffff'}
                  onChange={(e) => setCanvasBgColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer p-0 border-0"
                />
                <span className="text-[9px] font-mono text-slate-450">{canvasBgColor || '#ffffff'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
