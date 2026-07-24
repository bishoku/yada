import React, { useState, useEffect } from 'react';
import { Settings, Globe, Sun, Moon, Check, HardDrive, Folder, Sparkles, Sliders, Plus, Trash2 } from 'lucide-react';
import { translations } from '../../../i18n/translations';
import { StorageService, isTauri } from '../../../services/storage';
import { StorageMode } from '../../../services/storage/types';
import { useAppStore } from '../../../store/useAppStore';
import { LlmProfile } from '../../../types';

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
  const [activeTab, setActiveTab] = useState<'general' | 'integrations'>('general');

  const llmPreferences = useAppStore((state) => state.llmPreferences);
  const saveLlmPreferences = useAppStore((state) => state.saveLlmPreferences);

  useEffect(() => {
    if (isOpen) {
      setStorageMode(StorageService.getMode());
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);


  if (!isOpen) return null;

  const t = translations[language];

  // Multi-profile resolution
  const defaultProfiles: LlmProfile[] = [
    {
      id: 'openrouter-default',
      name: 'OpenRouter',
      provider: 'openrouter',
      apiUrl: llmPreferences.apiUrl || 'https://openrouter.ai/api/v1',
      apiKey: llmPreferences.apiKey || '',
      model: llmPreferences.model || 'anthropic/claude-3.5-sonnet',
    },
    {
      id: 'openai-default',
      name: 'OpenAI',
      provider: 'openai',
      apiUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o',
    },
    {
      id: 'anthropic-default',
      name: 'Anthropic',
      provider: 'anthropic',
      apiUrl: 'https://api.anthropic.com/v1',
      apiKey: '',
      model: 'claude-3-5-sonnet-20241022',
    },
    {
      id: 'gemini-default',
      name: 'Gemini',
      provider: 'gemini',
      apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: '',
      model: 'gemini-1.5-pro',
    },
  ];

  const profiles: LlmProfile[] = (llmPreferences.profiles && llmPreferences.profiles.length > 0)
    ? llmPreferences.profiles
    : defaultProfiles;

  const activeProfileId = llmPreferences.activeProfileId || profiles[0]?.id || 'openrouter-default';
  const currentProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  const handleSelectProfile = (profileId: string) => {
    const selected = profiles.find((p) => p.id === profileId);
    if (!selected) return;

    saveLlmPreferences({
      ...llmPreferences,
      activeProfileId: selected.id,
      profiles,
      provider: selected.provider,
      apiUrl: selected.apiUrl,
      apiKey: selected.apiKey,
      model: selected.model,
    });
  };

  const handleUpdateCurrentProfile = (updates: Partial<LlmProfile>) => {
    if (!currentProfile) return;

    const updatedProfiles = profiles.map((p) =>
      p.id === currentProfile.id ? { ...p, ...updates } : p
    );

    const updatedCurrent = { ...currentProfile, ...updates };

    saveLlmPreferences({
      ...llmPreferences,
      activeProfileId: updatedCurrent.id,
      profiles: updatedProfiles,
      provider: updatedCurrent.provider,
      apiUrl: updatedCurrent.apiUrl,
      apiKey: updatedCurrent.apiKey,
      model: updatedCurrent.model,
    });
  };

  const handleAddProfile = () => {
    const newId = `profile-${Date.now()}`;
    const newProfile: LlmProfile = {
      id: newId,
      name: language === 'tr' ? `Profil ${profiles.length + 1}` : `Profile ${profiles.length + 1}`,
      provider: 'openrouter',
      apiUrl: 'https://openrouter.ai/api/v1',
      apiKey: '',
      model: 'anthropic/claude-3.5-sonnet',
    };

    const updatedProfiles = [...profiles, newProfile];

    saveLlmPreferences({
      ...llmPreferences,
      activeProfileId: newId,
      profiles: updatedProfiles,
      provider: newProfile.provider,
      apiUrl: newProfile.apiUrl,
      apiKey: newProfile.apiKey,
      model: newProfile.model,
    });
  };

  const handleDeleteProfile = (profileId: string) => {
    if (profiles.length <= 1) return;

    const updatedProfiles = profiles.filter((p) => p.id !== profileId);
    const nextActive = updatedProfiles[0];

    saveLlmPreferences({
      ...llmPreferences,
      activeProfileId: nextActive.id,
      profiles: updatedProfiles,
      provider: nextActive.provider,
      apiUrl: nextActive.apiUrl,
      apiKey: nextActive.apiKey,
      model: nextActive.model,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl transition-all animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            {t.appPrefTitle}
          </h3>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-5 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            {language === 'tr' ? 'Uygulama Tercihleri' : 'Application Preferences'}
          </button>

          {isTauri() && (
            <button
              type="button"
              onClick={() => setActiveTab('integrations')}
              className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'integrations'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {language === 'tr' ? 'Entegrasyonlar' : 'Integrations'}
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* TAB 1: General Preferences */}
          {activeTab === 'general' && (
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
          )}

          {/* TAB 2: Integrations (LLM Multi-Profile) */}
          {activeTab === 'integrations' && isTauri() && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">
                  {language === 'tr' ? 'AI Asistan Profilleri (LLM)' : 'AI Assistant Profiles (LLM)'}
                </label>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                  {language === 'tr'
                    ? 'Birden fazla sağlayıcı profili tanımlayabilir, aktif olanı seçerek kullanabilirsiniz.'
                    : 'Manage multiple LLM profiles and switch between them.'}
                </p>
              </div>

              {/* Profile Selection & Actions */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    {language === 'tr' ? 'Aktif Profil' : 'Active Profile'}
                  </label>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleAddProfile}
                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title={language === 'tr' ? 'Yeni Profil Ekle' : 'Add New Profile'}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {language === 'tr' ? 'Yeni Ekle' : 'Add New'}
                    </button>

                    {profiles.length > 1 && currentProfile && (
                      <button
                        type="button"
                        onClick={() => handleDeleteProfile(currentProfile.id)}
                        className="p-1 hover:bg-rose-500/10 text-rose-500 rounded-lg cursor-pointer transition-colors"
                        title={language === 'tr' ? 'Profili Sil' : 'Delete Profile'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <select
                  value={activeProfileId}
                  onChange={(e) => handleSelectProfile(e.target.value)}
                  className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 cursor-pointer font-semibold"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.provider}) {p.id === activeProfileId ? (language === 'tr' ? '✓ Aktif' : '✓ Active') : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Profile Details Form */}
              {currentProfile && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      {language === 'tr' ? 'Profil Adı' : 'Profile Name'}
                    </label>
                    <input
                      type="text"
                      value={currentProfile.name || ''}
                      onChange={(e) => handleUpdateCurrentProfile({ name: e.target.value })}
                      className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 select-text font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Provider (Sağlayıcı)
                    </label>
                    <select
                      value={currentProfile.provider || 'openrouter'}
                      onChange={(e) => {
                        const provider = e.target.value as any;
                        let apiUrl = 'https://openrouter.ai/api/v1';
                        let model = 'anthropic/claude-3.5-sonnet';

                        if (provider === 'openai') {
                          apiUrl = 'https://api.openai.com/v1';
                          model = 'gpt-4o';
                        } else if (provider === 'anthropic') {
                          apiUrl = 'https://api.anthropic.com/v1';
                          model = 'claude-3-5-sonnet-20241022';
                        } else if (provider === 'gemini') {
                          apiUrl = 'https://generativelanguage.googleapis.com/v1beta';
                          model = 'gemini-1.5-pro';
                        }

                        handleUpdateCurrentProfile({
                          provider,
                          apiUrl,
                          model,
                        });
                      }}
                      className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 cursor-pointer font-medium"
                    >
                      <option value="openrouter">OpenRouter</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="gemini">Gemini</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      API Key
                    </label>
                    <input
                      type="password"
                      placeholder="sk-..."
                      value={currentProfile.apiKey || ''}
                      onChange={(e) => handleUpdateCurrentProfile({ apiKey: e.target.value })}
                      className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 select-text"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      API URL
                    </label>
                    <input
                      type="text"
                      value={currentProfile.apiUrl || ''}
                      onChange={(e) => handleUpdateCurrentProfile({ apiUrl: e.target.value })}
                      className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 select-text"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Model
                    </label>
                    <input
                      type="text"
                      value={currentProfile.model || ''}
                      onChange={(e) => handleUpdateCurrentProfile({ model: e.target.value })}
                      className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 select-text"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};


