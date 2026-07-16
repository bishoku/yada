import React from 'react';
import { Square, Circle, Triangle, Minus, Star, Hexagon, Type, Image as ImageIcon } from 'lucide-react';
import { ShapeType } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';

interface StudioSidebarProps {
  onAddShape: (type: ShapeType) => void;
}

const buttonClass =
  'flex items-center gap-2.5 w-full text-left text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-855 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors font-bold text-slate-700 dark:text-slate-350 cursor-pointer';

const sectionHeaderClass =
  'text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest';

export const StudioSidebar: React.FC<StudioSidebarProps> = ({ onAddShape }) => {
  const language = useAppStore((state) => state.language);
  const t = translations[language];

  return (
    <aside className="w-60 border-r border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 flex flex-col p-4 shrink-0 gap-2 overflow-y-auto">
      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
        {t.shapeLibrary}
      </span>

      {/* Basic Shapes */}
      <span className={sectionHeaderClass}>{t.basicShapes}</span>

      <button onClick={() => onAddShape('rectangle')} className={buttonClass}>
        <Square className="w-4 h-4 text-indigo-500" />
        <span>{t.rectangleCard}</span>
      </button>

      <button onClick={() => onAddShape('circle')} className={buttonClass}>
        <Circle className="w-4 h-4 text-emerald-500" />
        <span>{t.circleEllipse}</span>
      </button>

      <button onClick={() => onAddShape('triangle')} className={buttonClass}>
        <Triangle className="w-4 h-4 text-amber-500" />
        <span>{t.triangleShape}</span>
      </button>

      <button onClick={() => onAddShape('line')} className={buttonClass}>
        <Minus className="w-4 h-4 text-slate-500" />
        <span>{t.lineShape}</span>
      </button>

      {/* Advanced Shapes */}
      <span className={`${sectionHeaderClass} mt-2`}>{t.advancedShapes}</span>

      <button onClick={() => onAddShape('star')} className={buttonClass}>
        <Star className="w-4 h-4 text-yellow-500" />
        <span>{t.starShape}</span>
      </button>

      <button onClick={() => onAddShape('polygon')} className={buttonClass}>
        <Hexagon className="w-4 h-4 text-cyan-500" />
        <span>{t.polygonShape}</span>
      </button>

      {/* Text & Image */}
      <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />

      <button onClick={() => onAddShape('text')} className={buttonClass}>
        <Type className="w-4 h-4 text-violet-500" />
        <span>{t.textBox}</span>
      </button>

      <button onClick={() => onAddShape('image')} className={buttonClass}>
        <ImageIcon className="w-4 h-4 text-amber-500" />
        <span>{t.imageAsset}</span>
      </button>
    </aside>
  );
};
