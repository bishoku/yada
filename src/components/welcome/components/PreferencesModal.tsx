import React, { useState, useEffect } from 'react';
import { Settings, Globe, Sun, Moon, Check, HardDrive, Folder } from 'lucide-react';
import { translations } from '../../../i18n/translations';
import { StorageService, isTauri } from '../../../services/storage';
import { StorageMode } from '../../../services/storage/types';
import { useAppStore } from '../../../store/useAppStore';

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'tr' | 'en';
  theme: any;
  onChangeLanguage: (lang: 'tr' | 'en') => void;
  onChangeTheme: (theme: any) => void;
}

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  isOpen,
  onClose,
  language,
  theme,
  onChangeLanguage,
  onChangeTheme,
}) => {
  const [storageMode, setStorageMode] = useState<StorageMode>(StorageService.getMode());

  useEffect(() => {
    if (isOpen) {
      setStorageMode(StorageService.getMode());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const t = translations[language];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl transition-all animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            {t.appPrefTitle}
          </h3>
        </div>

        <div className="space-y-5">
          {/* Storage Location (Web Only) */}
          {!isTauri() && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5" />
                {language === 'tr' ? 'Depolama Konumu' : 'Storage Location'}
              </label>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await StorageService.setStorageMode('localstorage');
                    setStorageMode('localstorage');
                    await useAppStore.getState().fetchRecentWorkspaces();
                  }}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${
                    storageMode === 'localstorage'
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-650/25'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <HardDrive className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 text-left">
                    {language === 'tr' ? 'Sanal (LocalStorage)' : 'Virtual (LocalStorage)'}
                  </span>
                  {storageMode === 'localstorage' && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const success = await StorageService.setStorageMode('fs-access');
                    if (success) {
                      setStorageMode('fs-access');
                      await useAppStore.getState().fetchRecentWorkspaces();
                    }
                  }}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${
                    storageMode === 'fs-access'
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-650/25'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 text-left">
                    {language === 'tr' ? 'Yerel Klasör (.yada vb.)' : 'Local Folder (.yada etc.)'}
                  </span>
                  {storageMode === 'fs-access' && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              </div>
            </div>
          )}

          {/* Language Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              {t.language}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onChangeLanguage('tr')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  language === 'tr'
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-650/25'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {language === 'tr' && <Check className="w-3.5 h-3.5" />}
                {t.langTr}
              </button>
              <button
                onClick={() => onChangeLanguage('en')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  language === 'en'
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-650/25'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {language === 'en' && <Check className="w-3.5 h-3.5" />}
                {t.langEn}
              </button>
            </div>
          </div>

          {/* Theme Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              {theme === 'light' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {t.theme}
            </label>
            <div className="flex flex-col gap-1.5">
              {([
                { key: 'light', label: t.themeLight, Icon: Sun },
                { key: 'dark', label: t.themeDark, Icon: Moon },
                { key: 'nord', label: t.themeNord, Icon: Moon },
                { key: 'dracula', label: t.themeDracula, Icon: Moon },
                { key: 'synthwave', label: t.themeSynthwave, Icon: Moon },
                { key: 'retro', label: t.themeRetro, Icon: Moon },
              ] as const).map(({ key, label: themeLabel, Icon }) => (
                <button
                  key={key}
                  onClick={() => onChangeTheme(key)}
                  className={`py-2 px-3.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${
                    theme === key
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-650/25'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 text-left">{themeLabel}</span>
                  {theme === key && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-5 mt-5 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
