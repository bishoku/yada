import { Select, Input } from '../../ui/Field';
import { useId } from 'react';
import { ModalSurface } from '../../ui/ModalSurface';
import { useUiCopy } from '../../../i18n/useUiCopy';
import { message } from '../../../i18n/messages';
import React, { useState, useEffect } from 'react';
import { Settings, Globe, Sun, Moon, Check, HardDrive, Folder, Sparkles, Sliders, Plus, Trash2, ShieldCheck } from 'lucide-react';
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
  const fieldPrefix = useId();
  const uiCopy = useUiCopy();
  const [storageMode, setStorageMode] = useState<StorageMode>(StorageService.getMode());
  const [activeTab, setActiveTab] = useState<'general' | 'integrations'>('general');
  const [isAppStoreBuild, setIsAppStoreBuild] = useState<boolean>(false);
  const [iCloudPath, setICloudPath] = useState<string | null>(null);
  const [iCloudDebugMsg, setICloudDebugMsg] = useState<string>('');

  const llmPreferences = useAppStore((state) => state.llmPreferences);
  const saveLlmPreferences = useAppStore((state) => state.saveLlmPreferences);

  useEffect(() => {
    if (isOpen) {
      setStorageMode(StorageService.getMode());
      if (isTauri()) {
        import('@tauri-apps/api/core').then(({ invoke }) => {
          const checkICloud = async () => {
            try {
              const isAppStore = await invoke<boolean>('is_app_store_build');
              setIsAppStoreBuild(isAppStore);

              if (isAppStore) {
                const path = await invoke<string | null>('get_icloud_container_path');
                setICloudPath(path);
                if (!path) setICloudDebugMsg('Rust returned null');
              } else {
                setICloudPath(null);
              }
            } catch (err) {
              setICloudPath(null);
              setICloudDebugMsg(`Rust error: ${String(err)}`);
            }
          };
          checkICloud();
        }).catch((err) => {
          setICloudDebugMsg(`Import error: ${String(err)}`);
        });
      }
    }
  }, [isOpen]);




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
      name: 'Google Gemini',
      provider: 'gemini',
      apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: '',
      model: 'gemini-1.5-pro',
    },
    {
      id: 'ollama-default',
      name: 'Ollama (Local)',
      provider: 'ollama',
      apiUrl: 'http://localhost:11434/v1',
      apiKey: '',
      model: 'llama3.2',
    },
  ];

  const profiles: LlmProfile[] = (llmPreferences.profiles && llmPreferences.profiles.length > 0)
    ? llmPreferences.profiles
    : defaultProfiles;

  const activeProfileId = llmPreferences.activeProfileId || profiles[0]?.id || 'openrouter-default';
  const currentProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  const handleSelectProfile = (id: string) => {
    const selected = profiles.find((p) => p.id === id);
    if (selected) {
      saveLlmPreferences({
        ...llmPreferences,
        activeProfileId: id,
        provider: selected.provider,
        apiUrl: selected.apiUrl,
        apiKey: selected.apiKey,
        model: selected.model,
        profiles,
      });
    }
  };

  const handleAddProfile = () => {
    const newId = `profile-${Date.now()}`;
    const newProfile: LlmProfile = {
      id: newId,
      name: message(language, "PreferencesModal.newProfile", { value1: profiles.length + 1 }),
      provider: 'openrouter',
      apiUrl: 'https://openrouter.ai/api/v1',
      apiKey: '',
      model: 'anthropic/claude-3.5-sonnet',
    };

    const updated = [...profiles, newProfile];
    saveLlmPreferences({
      ...llmPreferences,
      activeProfileId: newId,
      provider: newProfile.provider,
      apiUrl: newProfile.apiUrl,
      apiKey: newProfile.apiKey,
      model: newProfile.model,
      profiles: updated,
    });
  };

  const handleDeleteProfile = (id: string) => {
    if (profiles.length <= 1) return;
    const updated = profiles.filter((p) => p.id !== id);
    const nextActive = updated[0];
    saveLlmPreferences({
      ...llmPreferences,
      activeProfileId: nextActive.id,
      provider: nextActive.provider,
      apiUrl: nextActive.apiUrl,
      apiKey: nextActive.apiKey,
      model: nextActive.model,
      profiles: updated,
    });
  };

  const handleUpdateCurrentProfile = (partial: Partial<LlmProfile>) => {
    const updated = profiles.map((p) => (p.id === activeProfileId ? { ...p, ...partial } : p));
    const current = updated.find((p) => p.id === activeProfileId);
    if (current) {
      saveLlmPreferences({
        ...llmPreferences,
        activeProfileId,
        provider: current.provider,
        apiUrl: current.apiUrl,
        apiKey: current.apiKey,
        model: current.model,
        profiles: updated,
      });
    }
  };

  return (
    <ModalSurface label={t.appPrefTitle} onClose={onClose} width="28rem">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl transition-all animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            {t.appPrefTitle}
          </h3>
        </div>

        {/* Tab Navigation */}
        <div role="tablist" aria-label={t.appPrefTitle} className="flex border-b border-slate-200 dark:border-slate-800 mb-5 gap-2" onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 'general' : event.key === 'End' ? 'integrations' : activeTab === 'general' ? 'integrations' : 'general';
          setActiveTab(next);
          event.currentTarget.querySelector<HTMLElement>(`[data-preference-tab="${next}"]`)?.focus();
        }}>
          <button
            type="button"
            role="tab" data-preference-tab="general" id={`${fieldPrefix}-general-tab`} aria-controls={`${fieldPrefix}-general-panel`} aria-selected={activeTab === 'general'} tabIndex={activeTab === 'general' ? 0 : -1}
            onClick={() => setActiveTab('general')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            {message(language, "PreferencesModal.applicationPreferences")}
          </button>

          <button
            type="button"
            role="tab" data-preference-tab="integrations" id={`${fieldPrefix}-integrations-tab`} aria-controls={`${fieldPrefix}-integrations-panel`} aria-selected={activeTab === 'integrations'} tabIndex={activeTab === 'integrations' ? 0 : -1}
            onClick={() => setActiveTab('integrations')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'integrations'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {message(language, "PreferencesModal.integrations")}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {/* TAB 1: General Preferences */}
          <div role="tabpanel" id={`${fieldPrefix}-general-panel`} aria-labelledby={`${fieldPrefix}-general-tab`} hidden={activeTab !== 'general'}>
          {activeTab === 'general' && (
            <div className="space-y-5">
              {/* Storage Location (Web Only) */}
              {!isTauri() && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5" />
                    {message(language, "PreferencesModal.storageLocation")}
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
                        {message(language, "PreferencesModal.virtualLocalStorage")}
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
                        {message(language, "PreferencesModal.localFolderYadaEtc")}
                      </span>
                      {storageMode === 'fs-access' && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Storage Location (Tauri with iCloud) */}
              {isTauri() && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5" />
                    {message(language, "PreferencesModal.storageLocation")}
                  </label>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await StorageService.setStorageMode('tauri');
                        setStorageMode('tauri');
                        await useAppStore.getState().fetchRecentWorkspaces();
                      }}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${
                        storageMode === 'tauri'
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-650/25'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <HardDrive className="w-3.5 h-3.5 shrink-0" />
                      <span className="flex-1 text-left">
                        {message(language, "PreferencesModal.macLocalFolderYada")}
                      </span>
                      {storageMode === 'tauri' && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                    {isAppStoreBuild && (
                      <button
                        type="button"
                        disabled={!iCloudPath}
                        onClick={async () => {
                          if (!iCloudPath) return;
                          const success = await StorageService.setStorageMode('icloud-drive');
                          if (success) {
                            setStorageMode('icloud-drive');
                            await useAppStore.getState().fetchRecentWorkspaces();
                          }
                        }}
                        className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all flex flex-col items-start gap-1 ${
                          !iCloudPath ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400' : 'cursor-pointer'
                        } ${
                          storageMode === 'icloud-drive'
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-650/25'
                            : !iCloudPath ? '' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.5 19C19.985 19 22 16.985 22 14.5C22 12.186 20.248 10.28 18 10.027C17.659 6.643 14.773 4 11.25 4C7.522 4 4.5 7.022 4.5 10.75C4.5 10.871 4.503 10.991 4.509 11.11C2.531 11.603 1 13.4 1 15.5C1 17.985 3.015 20 5.5 20H17.5Z"/>
                          </svg>
                          <span className="flex-1 text-left">
                            {language === 'tr' ? 'iCloud Drive' : 'iCloud Drive'}
                          </span>
                          {storageMode === 'icloud-drive' && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </div>
                        {!iCloudPath && (
                          <div className="text-xs text-red-500 font-normal pl-5 w-full text-left break-all">
                            {uiCopy.error} {iCloudDebugMsg || 'Bilinmiyor'}
                          </div>
                        )}
                      </button>
                    )}
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
                    aria-pressed={language === 'tr'} onClick={() => onChangeLanguage('tr')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      language === 'tr' ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {language === 'tr' && <Check className="w-3.5 h-3.5" />}
                    {t.langTr}
                  </button>
                  <button
                    aria-pressed={language === 'en'} onClick={() => onChangeLanguage('en')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      language === 'en' ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
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
                      aria-pressed={theme === key} onClick={() => onChangeTheme(key)}
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

          </div>

          {/* TAB 2: Integrations (LLM Multi-Profile) */}
          <div role="tabpanel" id={`${fieldPrefix}-integrations-panel`} aria-labelledby={`${fieldPrefix}-integrations-tab`} hidden={activeTab !== 'integrations'}>
          {activeTab === 'integrations' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">
                  {message(language, "PreferencesModal.aIAssistantProfilesLLM")}
                </label>
                <p className="text-xs text-slate-400 leading-relaxed mb-2">
                  {message(language, "PreferencesModal.manageMultipleLLMProfilesAndSwitchBetween")}
                </p>

                {/* Web Crypto Vault Security Badge */}
                <div className="flex items-center gap-1.5 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-3">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {message(language, "PreferencesModal.yourAPIKeysAreEncryptedLocallyUsing")}
                  </span>
                </div>
              </div>

              {/* Profile Selection & Actions */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor={`${fieldPrefix}-active-profile`} className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {message(language, "PreferencesModal.activeProfile")}
                  </label>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleAddProfile}
                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title={message(language, "PreferencesModal.addNewProfile")}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {message(language, "PreferencesModal.addNew")}
                    </button>

                    {profiles.length > 1 && currentProfile && (
                      <button
                        type="button"
                        onClick={() => handleDeleteProfile(currentProfile.id)}
                        className="p-1 hover:bg-rose-500/10 text-rose-500 rounded-lg cursor-pointer transition-colors"
                        title={message(language, "PreferencesModal.deleteProfile")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <Select
                  id={`${fieldPrefix}-active-profile`}
                  value={activeProfileId}
                  onChange={(e) => handleSelectProfile(e.target.value)}
                  className="w-full"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.provider}) {p.id === activeProfileId ? (message(language, "PreferencesModal.active")) : ''}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Profile Details Form */}
              {currentProfile && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1" htmlFor={`${fieldPrefix}-modal-field-1`}>
                      {message(language, "PreferencesModal.profileName")}
                    </label>
                    <Input
                      type="text"
                      value={currentProfile.name || ''}
                      onChange={(e) => handleUpdateCurrentProfile({ name: e.target.value })}
                      className="w-full"
                     id={`${fieldPrefix}-modal-field-1`}/>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1" htmlFor={`${fieldPrefix}-modal-field-2`}>
                      {uiCopy.provider}
                    </label>
                    <Select
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
                        } else if (provider === 'ollama') {
                          apiUrl = 'http://localhost:11434/v1';
                          model = 'llama3.2';
                        } else if (provider === 'custom') {
                          apiUrl = '';
                          model = '';
                        }

                        handleUpdateCurrentProfile({
                          provider,
                          apiUrl,
                          model,
                        });
                      }}
                      className="w-full"
                     id={`${fieldPrefix}-modal-field-2`}>
                      <option value="openrouter">{uiCopy.openRouterRecommended}</option>
                      <option value="openai">OpenAI</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="anthropic">Anthropic (Claude)</option>
                      <option value="ollama">{uiCopy.ollamaLocalOffline}</option>
                      <option value="custom">{uiCopy.customOther}</option>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between" htmlFor={`${fieldPrefix}-modal-field-3`}>
                      <span>{uiCopy.aPIKey}</span>
                      {currentProfile.provider === 'ollama' && (
                        <span className="text-xs text-slate-400 font-normal">
                          {message(language, "PreferencesModal.optionalForOllama")}
                        </span>
                      )}
                    </label>
                    <Input
                      type="password"
                      placeholder={currentProfile.provider === 'ollama' ? message(language, 'PreferencesModal.optionalForOllama') : 'sk-...'}
                      value={currentProfile.apiKey || ''}
                      onChange={(e) => handleUpdateCurrentProfile({ apiKey: e.target.value })}
                      className="w-full"
                     id={`${fieldPrefix}-modal-field-3`}/>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1" htmlFor={`${fieldPrefix}-modal-field-4`}>
                      {uiCopy.aPIURL}
                    </label>
                    <Input
                      type="text"
                      value={currentProfile.apiUrl || ''}
                      onChange={(e) => handleUpdateCurrentProfile({ apiUrl: e.target.value })}
                      className="w-full"
                     id={`${fieldPrefix}-modal-field-4`}/>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1" htmlFor={`${fieldPrefix}-modal-field-5`}>
                      {uiCopy.model}
                    </label>
                    <Input
                      type="text"
                      value={currentProfile.model || ''}
                      onChange={(e) => handleUpdateCurrentProfile({ model: e.target.value })}
                      className="w-full"
                     id={`${fieldPrefix}-modal-field-5`}/>
                  </div>
                </div>
              )}
            </div>
          )}
          </div>

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
    </ModalSurface>
  );
};


