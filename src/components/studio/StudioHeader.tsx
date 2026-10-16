import { Input, Select } from '../ui/Field';
import { message } from '../../i18n/messages';
import { useUiCopy } from '../../i18n/useUiCopy';
import React from 'react';
import { Save, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';

interface StudioHeaderProps {
  name: string;
  category: string;
  width: number;
  height: number;
  error: string | null;
  onBack: () => void;
  onNameChange: (name: string) => void;
  onCategoryChange: (category: string) => void;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onSave: () => void;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  name,
  category,
  width,
  height,
  error,
  onBack,
  onNameChange,
  onCategoryChange,
  onWidthChange,
  onHeightChange,
  onSave,
}) => {
  const uiCopy = useUiCopy();
  const language = useAppStore((state) => state.language);
  const t = translations[language];

  return (
    <header className="h-11 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-4 z-20 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t.componentStudioTitle}
          </span>
          <Input
            type="text"
            placeholder={t.componentNamePlaceholder}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className=""
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-550 dark:text-slate-400">
          <span>{t.categoryLabel}</span>
          <Select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className=""
          >
            <option value="Client">{t.clientCat}</option>
            <option value="Server">{t.serverCat}</option>
            <option value="Database">{t.databaseCat}</option>
            <option value="Gateway">{message(language, 'StudioHeader.apiGateway')}</option>
            <option value="Cache">{t.cacheCat}</option>
            <option value="Queue">{t.queueCat}</option>
            <option value="Custom">{t.otherCat}</option>
          </Select>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-550 dark:text-slate-400">
          <span>{t.canvasPresets}</span>
          <Select
            value={
              [32, 48, 64, 96, 128, 256].some((s) => width === s && height === s)
                ? `${width}`
                : 'custom'
            }
            onChange={(e) => {
              if (e.target.value !== 'custom') {
                const size = Number(e.target.value);
                onWidthChange(size);
                onHeightChange(size);
              }
            }}
            className=""
          >
            <option value="32">32 × 32</option>
            <option value="48">48 × 48</option>
            <option value="64">64 × 64</option>
            <option value="96">96 × 96</option>
            <option value="128">128 × 128</option>
            <option value="256">256 × 256</option>
            <option value="custom">{t.customSize}</option>
          </Select>
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-550 dark:text-slate-400">
          <span>{uiCopy.w}</span>
          <Input
            type="number"
            value={width}
            onChange={(e) => onWidthChange(Math.max(50, Number(e.target.value)))}
            className="w-14 text-center"
          />
          <span className="ml-1">{uiCopy.h}</span>
          <Input
            type="number"
            value={height}
            onChange={(e) => onHeightChange(Math.max(50, Number(e.target.value)))}
            className="w-14 text-center"
          />
        </div>

        {error && <span className="text-xs text-rose-500 font-semibold">{error}</span>}

        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{t.save}</span>
        </button>
      </div>
    </header>
  );
};
