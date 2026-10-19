import { editingCopy } from '../../i18n/editingCopy';
import { message } from '../../i18n/messages';
import React from 'react';
import {
  MousePointer2,
  Square,
  Diamond,
  Circle,
  ArrowUpRight,
  Minus,
  Pen,
  Highlighter,
  Type,
  Eraser,
  Trash2,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const COLOR_PRESETS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#ffffff', // White
  '#0f172a', // Slate Dark
];

const SIZE_PRESETS = [
  { label: 'S', value: 2 },
  { label: 'M', value: 4 },
  { label: 'L', value: 7 },
];

export const DrawingToolbar: React.FC = () => {
  const language = useAppStore((s) => s.language);
  const copy = editingCopy[language];
  const activeDrawingTool = useAppStore((s) => s.activeDrawingTool);
  const drawingColor = useAppStore((s) => s.drawingColor);
  const drawingSize = useAppStore((s) => s.drawingSize);
  const setActiveDrawingTool = useAppStore((s) => s.setActiveDrawingTool);
  const setDrawingColor = useAppStore((s) => s.setDrawingColor);
  const setDrawingSize = useAppStore((s) => s.setDrawingSize);
  const clearFreehandStrokes = useAppStore((s) => s.clearFreehandStrokes);
  const strokeCount = useAppStore((s) => (s.visualData?.freehandStrokes ? Object.keys(s.visualData.freehandStrokes).length : 0));

  if (!activeDrawingTool) return null;

  return (
    <div className="yada-drawing-toolbar export-exclude absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Select / Move Mode */}
      <button
        aria-pressed={activeDrawingTool === 'select'} onClick={() => setActiveDrawingTool('select')}
        className={`p-2 rounded-xl transition-all ${
          activeDrawingTool === 'select'
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-105'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
        }`}
        title={message(language, "DrawingToolbar.selectMoveV")}
      >
        <MousePointer2 className="w-4 h-4" />
      </button>

      <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

      {/* Shapes & Creation Tools */}
      <div className="flex items-center gap-1">
        <button
          aria-pressed={activeDrawingTool === 'rectangle'} onClick={() => setActiveDrawingTool('rectangle')}
          className={`p-2 rounded-xl transition-all ${
            activeDrawingTool === 'rectangle'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-105'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
          title={message(language, "DrawingToolbar.rectangleR")}
        >
          <Square className="w-4 h-4" />
        </button>

        <button
          aria-pressed={activeDrawingTool === 'diamond'} onClick={() => setActiveDrawingTool('diamond')}
          className={`p-2 rounded-xl transition-all ${
            activeDrawingTool === 'diamond'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-105'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
          title={message(language, "DrawingToolbar.diamondD")}
        >
          <Diamond className="w-4 h-4" />
        </button>

        <button
          aria-pressed={activeDrawingTool === 'ellipse'} onClick={() => setActiveDrawingTool('ellipse')}
          className={`p-2 rounded-xl transition-all ${
            activeDrawingTool === 'ellipse'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-105'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
          title={message(language, "DrawingToolbar.ellipseCircleO")}
        >
          <Circle className="w-4 h-4" />
        </button>

        <button
          aria-pressed={activeDrawingTool === 'arrow'} onClick={() => setActiveDrawingTool('arrow')}
          className={`p-2 rounded-xl transition-all ${
            activeDrawingTool === 'arrow'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-105'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
          title={message(language, "DrawingToolbar.arrowA")}
        >
          <ArrowUpRight className="w-4 h-4" />
        </button>

        <button
          aria-pressed={activeDrawingTool === 'line'} onClick={() => setActiveDrawingTool('line')}
          className={`p-2 rounded-xl transition-all ${
            activeDrawingTool === 'line'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-105'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
          title={message(language, "DrawingToolbar.lineL")}
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          aria-pressed={activeDrawingTool === 'pen'} onClick={() => setActiveDrawingTool('pen')}
          className={`p-2 rounded-xl transition-all ${
            activeDrawingTool === 'pen'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-105'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
          title={message(language, "DrawingToolbar.drawPenP")}
        >
          <Pen className="w-4 h-4" />
        </button>

        <button
          aria-pressed={activeDrawingTool === 'highlighter'} onClick={() => setActiveDrawingTool('highlighter')}
          className={`p-2 rounded-xl transition-all ${
            activeDrawingTool === 'highlighter'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 scale-105'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
          title={message(language, "DrawingToolbar.highlighterH")}
        >
          <Highlighter className="w-4 h-4" />
        </button>

        <button
          aria-pressed={activeDrawingTool === 'text'} onClick={() => setActiveDrawingTool('text')}
          className={`p-2 rounded-xl transition-all ${
            activeDrawingTool === 'text'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-500/25 scale-105'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
          title={message(language, "DrawingToolbar.textT")}
        >
          <Type className="w-4 h-4" />
        </button>

        <button
          aria-pressed={activeDrawingTool === 'eraser'} onClick={() => setActiveDrawingTool('eraser')}
          className={`p-2 rounded-xl transition-all ${
            activeDrawingTool === 'eraser'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25 scale-105'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
          title={message(language, "DrawingToolbar.eraserE")}
        >
          <Eraser className="w-4 h-4" />
        </button>
      </div>

      {activeDrawingTool !== 'eraser' && (
        <>
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* Color Presets */}
          <div className="flex items-center gap-1.5">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                aria-label={copy.strokeColor.replace('{value}', c)} aria-pressed={drawingColor === c}
                onClick={() => setDrawingColor(c)}
                className={`w-6 h-6 rounded-full border transition-all ${
                  drawingColor === c
                    ? 'ring-2 ring-indigo-500 scale-115 border-white dark:border-slate-900'
                    : 'border-slate-300 dark:border-slate-700 hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* Size Presets */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
            {SIZE_PRESETS.map((s) => (
              <button
                key={s.label}
                aria-label={copy.strokeWidth.replace('{value}', String(s.value))} aria-pressed={drawingSize === s.value}
                onClick={() => setDrawingSize(s.value)}
                className={`px-2 py-0.5 text-xs font-bold rounded-md transition-all ${
                  drawingSize === s.value
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}

      {strokeCount > 0 && (
        <>
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />
          <button
            onClick={clearFreehandStrokes}
            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            title={message(language, "DrawingToolbar.clearAllDrawings")}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      )}

      <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

      {/* Exit Drawing Mode */}
      <button
        onClick={() => setActiveDrawingTool(null)}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title={message(language, "DrawingToolbar.exitDrawingMode")}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

