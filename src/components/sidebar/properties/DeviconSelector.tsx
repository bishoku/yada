import React, { useState } from 'react';
import {
  DeviconRegistry,
  getUniqueAllDevicons,
  getDeviconComponent,
  findDeviconItem
} from '../../../registry/DeviconRegistry';

interface DeviconSelectorProps {
  type: string;
  customStyles: any;
  setCustomStyles: (styles: any) => void;
  onPreviewStyles: (styles: any) => void;
  language: string;
}

export const DeviconSelector: React.FC<DeviconSelectorProps> = ({
  type,
  customStyles,
  setCustomStyles,
  onPreviewStyles,
  language,
}) => {
  const [iconSearch, setIconSearch] = useState('');
  const tr = (t: string, e: string) => (language === 'tr' ? t : e);

  return (
    <details className="mt-2 group border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/30 dark:bg-slate-900/10 overflow-hidden transition-all duration-200">
      <summary className="flex items-center justify-between p-3 font-semibold text-xs text-slate-700 dark:text-slate-350 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/30 list-none focus:outline-none select-none">
        <span>{tr('Gelişmiş Görünüm (Ürün İkonu)', 'Advanced Customization (Icon)')}</span>
        <svg
          className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/60 flex flex-col gap-3">
        {/* Options: Colored & Wordmark */}
        <div className="flex gap-4 items-center">
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 dark:text-slate-400 select-none">
            <input
              type="checkbox"
              checked={customStyles.productIconColored !== false}
              onChange={(e) => {
                const nextStyles = { ...customStyles, productIconColored: e.target.checked };
                setCustomStyles(nextStyles);
                onPreviewStyles(nextStyles);
              }}
              className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500"
            />
            {tr('Renkli', 'Colored')}
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 dark:text-slate-400 select-none">
            <input
              type="checkbox"
              checked={!!customStyles.productIconWordmark}
              onChange={(e) => {
                const nextStyles = { ...customStyles, productIconWordmark: e.target.checked };
                setCustomStyles(nextStyles);
                onPreviewStyles(nextStyles);
              }}
              className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500"
            />
            {tr('Metinli (Wordmark)', 'Wordmark')}
          </label>
        </div>

        {/* Selected Icon Status */}
        {customStyles.productIcon && (
          <div className="flex items-center justify-between p-2 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 flex items-center justify-center bg-white dark:bg-slate-900 rounded p-0.5 shadow-sm border border-slate-100 dark:border-slate-800">
                {(() => {
                  const item = findDeviconItem(customStyles.productIcon);
                  if (item) {
                    const IconComponent = getDeviconComponent(
                      item,
                      customStyles.productIconColored !== false,
                      !!customStyles.productIconWordmark
                    );
                    return IconComponent ? <IconComponent size={20} /> : null;
                  }
                  return null;
                })()}
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {findDeviconItem(customStyles.productIcon)?.name || customStyles.productIcon}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextStyles = { ...customStyles };
                delete nextStyles.productIcon;
                delete nextStyles.productIconColored;
                delete nextStyles.productIconWordmark;
                setCustomStyles(nextStyles);
                onPreviewStyles(nextStyles);
              }}
              className="text-[10px] font-bold text-rose-500 hover:text-rose-600 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-2 py-1 rounded-md transition-colors"
            >
              {tr('Varsayılana Dön', 'Reset to Default')}
            </button>
          </div>
        )}

        {/* Curated Icons for Component Type */}
        {(() => {
          const curated = DeviconRegistry[type] || [];
          if (curated.length === 0) return null;
          return (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {tr('Bu Bileşene Özel İkonlar', 'Recommended for this type')}
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {curated.map((item) => {
                  const IconComponent = getDeviconComponent(
                    item,
                    customStyles.productIconColored !== false,
                    !!customStyles.productIconWordmark
                  );
                  const isSelected = customStyles.productIcon === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        const nextStyles = { ...customStyles, productIcon: item.id };
                        setCustomStyles(nextStyles);
                        onPreviewStyles(nextStyles);
                      }}
                      className={`p-2 border rounded-lg flex flex-col items-center gap-1 hover:border-indigo-500 dark:hover:border-indigo-500/80 transition-all ${
                        isSelected
                          ? 'bg-indigo-500/10 border-indigo-500 dark:bg-indigo-550/20'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                      }`}
                      title={item.name}
                    >
                      <div className="w-6 h-6 flex items-center justify-center">
                        {IconComponent && <IconComponent size={22} />}
                      </div>
                      <span className="text-[9px] font-semibold text-slate-550 dark:text-slate-400 truncate w-full text-center">
                        {item.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* All Icons Catalog Search */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {tr('Tüm İkonları Ara', 'Search All Icons')}
          </span>
          <input
            type="text"
            value={iconSearch}
            onChange={(e) => setIconSearch(e.target.value)}
            placeholder={tr('İkon ara...', 'Search icons...')}
            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-850 dark:text-slate-200"
          />
          {iconSearch && (
            <div className="grid grid-cols-4 gap-1.5 max-h-[140px] overflow-y-auto p-0.5 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-955/30">
              {getUniqueAllDevicons()
                .filter((item) => item.name.toLowerCase().includes(iconSearch.toLowerCase()))
                .map((item) => {
                  const IconComponent = getDeviconComponent(
                    item,
                    customStyles.productIconColored !== false,
                    !!customStyles.productIconWordmark
                  );
                  const isSelected = customStyles.productIcon === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        const nextStyles = { ...customStyles, productIcon: item.id };
                        setCustomStyles(nextStyles);
                        onPreviewStyles(nextStyles);
                      }}
                      className={`p-2 border rounded-lg flex flex-col items-center gap-1 hover:border-indigo-500 dark:hover:border-indigo-500/80 transition-all ${
                        isSelected
                          ? 'bg-indigo-500/10 border-indigo-500 dark:bg-indigo-550/20'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                      }`}
                      title={item.name}
                    >
                      <div className="w-6 h-6 flex items-center justify-center">
                        {IconComponent && <IconComponent size={22} />}
                      </div>
                      <span className="text-[9px] font-semibold text-slate-550 dark:text-slate-400 truncate w-full text-center">
                        {item.name}
                      </span>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </details>
  );
};
