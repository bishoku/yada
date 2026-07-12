import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { LogOut, Settings, Database, Cpu, Check, Globe, Moon, Sun, PanelLeft, PanelRight, Play, Pause, Square } from 'lucide-react';
import { translations } from '../../i18n/translations';
import { calculateSchedules } from '../../store/scheduler';

export const TopBar: React.FC = () => {
  const { 
    currentWorkspace, 
    isDirty, 
    setWorkspace, 
    language, 
    theme, 
    changeLanguage, 
    changeTheme,
    saveWorkspaceDetails,
    leftSidebarOpen,
    rightSidebarOpen,
    toggleLeftSidebar,
    toggleRightSidebar,
    isPlaying,
    currentTime,
    playbackRate,
    startPlayback,
    pausePlayback,
    stopPlayback,
    setPlaybackRate,
    logicalData,
    visualData
  } = useAppStore();

  const t = translations[language];

  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState(currentWorkspace?.name || '');
  const [editDesc, setEditDesc] = useState(currentWorkspace?.description || '');

  const schedules = calculateSchedules(logicalData.sequences, visualData.timelines);
  const maxTime = Math.max(
    2000,
    ...Object.values(schedules).map((s) => {
      const seqId = Object.keys(schedules).find(k => schedules[k] === s);
      const timing = seqId ? visualData.timelines[seqId] : null;
      const tooltipDur = timing?.internalProcess?.duration ?? 0;
      return s.end + tooltipDur;
    })
  );

  const handleBackToWelcome = () => {
    setWorkspace(null);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    saveWorkspaceDetails(editName.trim(), editDesc.trim());
    setShowSettings(false);
  };

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex items-center justify-between px-4 z-25 select-none shrink-0 relative transition-colors duration-300">
      
      {/* Left Section: Branding & Workspace Name */}
      <div className="flex items-center gap-4">
        <div 
          onClick={handleBackToWelcome} 
          className="flex items-center gap-1.5 cursor-pointer" 
          title={language === 'tr' ? 'Giriş ekranına dön' : 'Go back to welcome screen'}
        >
          <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-200 dark:to-slate-200 bg-clip-text text-transparent">
            {t.welcomeTitle}
          </span>
        </div>
        
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
        
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-300">
            {currentWorkspace?.name}
          </span>
          
          <button
            onClick={() => {
              setEditName(currentWorkspace?.name || '');
              setEditDesc(currentWorkspace?.description || '');
              setShowSettings(true);
            }}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 rounded cursor-pointer transition-colors"
            title={t.settings}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

        <div className="flex items-center gap-1">
          <button
            onClick={toggleLeftSidebar}
            className={`p-1.5 rounded cursor-pointer transition-colors ${
              leftSidebarOpen 
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10' 
                : 'text-slate-400 hover:bg-slate-100 dark:text-slate-550 dark:hover:bg-slate-800'
            }`}
            title={language === 'tr' ? 'Sol paneli gizle/göster' : 'Toggle left sidebar'}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          
          <button
            onClick={toggleRightSidebar}
            className={`p-1.5 rounded cursor-pointer transition-colors ${
              rightSidebarOpen 
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10' 
                : 'text-slate-400 hover:bg-slate-100 dark:text-slate-550 dark:hover:bg-slate-800'
            }`}
            title={language === 'tr' ? 'Sağ paneli gizle/göster' : 'Toggle right sidebar'}
          >
            <PanelRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Middle Section: Auto-Save Indicator */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100/80 dark:bg-slate-900/50 rounded-full border border-slate-200 dark:border-slate-800">
          {isDirty ? (
            <>
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">{t.unsavedChanges}</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">{t.saved}</span>
            </>
          )}
        </div>
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center gap-3">
        {/* Playback Controls Area */}
        <div className="flex items-center gap-2 mr-2 border-r border-slate-200 dark:border-slate-800 pr-3">
          {isPlaying ? (
            <button 
              onClick={pausePlayback}
              className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
              title={language === 'tr' ? 'Duraklat' : 'Pause'}
            >
              <Pause className="w-3.5 h-3.5 fill-indigo-600 dark:fill-indigo-400" />
            </button>
          ) : (
            <button 
              onClick={startPlayback}
              disabled={logicalData.sequences.length === 0}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
              title={language === 'tr' ? 'Oynat' : 'Play'}
            >
              <Play className="w-3.5 h-3.5 fill-white" />
            </button>
          )}
          
          <button 
            onClick={stopPlayback}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
            title={language === 'tr' ? 'Durdur' : 'Stop'}
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          <span 
            className="text-[10px] font-mono text-slate-500 dark:text-slate-400 min-w-[85px] text-center bg-slate-50 dark:bg-slate-900/80 px-2 py-1 rounded border border-slate-200/50 dark:border-slate-800/50"
          >
            {currentTime.toFixed(0)}ms / {maxTime}ms
          </span>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded border border-slate-200/50 dark:border-slate-800/50">
            {[0.5, 1, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all duration-155 ${
                  playbackRate === rate 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono hidden sm:block truncate max-w-[200px]" title={currentWorkspace?.path}>
          {currentWorkspace?.path}
        </div>
        
        <button
          onClick={handleBackToWelcome}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-semibold rounded-lg text-xs cursor-pointer transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t.close}</span>
        </button>
      </div>

      {/* Settings Modal (Includes Workspace and App Preferences) */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl transition-all">
            
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              {t.editWorkspaceDetails}
            </h3>
            
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  {t.workspaceName}
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-55 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-indigo-500/80"
                  maxLength={50}
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  {t.description}
                </label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-55 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-indigo-500/80 resize-none"
                  maxLength={200}
                />
              </div>

              {/* Application Preferences Section inside Modal */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">
                  {t.appPrefTitle}
                </h4>
                
                {/* Language Select */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-650 dark:text-slate-350 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" />
                    {t.language}:
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => changeLanguage('tr')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                        language === 'tr'
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {t.langTr}
                    </button>
                    <button
                      type="button"
                      onClick={() => changeLanguage('en')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                        language === 'en'
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {t.langEn}
                    </button>
                  </div>
                </div>

                {/* Theme Select */}
                <div className="flex items-center justify-between text-xs mt-2">
                  <span className="text-slate-650 dark:text-slate-350 flex items-center gap-1">
                    {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                    {t.theme}:
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => changeTheme('dark')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                        theme === 'dark'
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {t.themeDark}
                    </button>
                    <button
                      type="button"
                      onClick={() => changeTheme('light')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                        theme === 'light'
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {t.themeLight}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-semibold rounded-xl text-xs cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
