import { useUiCopy } from '../../i18n/useUiCopy';
import { message } from '../../i18n/messages';
import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { FolderHeart, Database, ShieldAlert, LayoutDashboard, ListOrdered } from 'lucide-react';
import { translations } from '../../i18n/translations';
import { WorkspacePickerModal } from './WorkspacePickerModal';

export const SharedTopBar: React.FC = () => {
  const uiCopy = useUiCopy();
  const currentWorkspace = useAppStore((s) => s.currentWorkspace);
  const setWorkspace = useAppStore((s) => s.setWorkspace);
  const language = useAppStore((s) => s.language);
  const fetchRecentWorkspaces = useAppStore((s) => s.fetchRecentWorkspaces);
  const saveSharedToWorkspace = useAppStore((s) => s.saveSharedToWorkspace);
  const viewMode = useAppStore((s) => s.viewMode);
  const toggleViewMode = useAppStore((s) => s.toggleViewMode);
  const openAlert = useAppStore((s) => s.openAlert);

  const [showPickerModal, setShowPickerModal] = useState(false);

  const t = translations[language];


  const handleBackToWelcome = () => {
    setWorkspace(null);
  };

  const handlePickerConfirm = async (
    targetWorkspacePath: string | null,
    _targetWorkspaceName: string,
    isNew: boolean,
    newWorkspaceName?: string,
    targetDiagramName?: string
  ) => {
    try {
      await saveSharedToWorkspace(targetWorkspacePath, isNew, newWorkspaceName, targetDiagramName);
    } catch (err: any) {
      console.error(err);
      openAlert({
        title: message(language, "SharedTopBar.error"),
        message: err.message || (message(language, "SharedTopBar.saveFailed"))
      });
      throw err;
    }
  };

  return (
    <>
      <header className="h-11 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center px-4 justify-between z-25 select-none shrink-0 transition-colors duration-300 font-sans">

        {/* Left: App Logo & Workspace Name Badge */}
        <div className="flex items-center gap-3">
          <div
            onClick={handleBackToWelcome}
            className="flex items-center gap-1.5 cursor-pointer group shrink-0"
            title={message(language, "SharedTopBar.goBackToWelcomeScreen")}
          >
            <img src="pwa-icon.png" className="h-6 w-6 transition-transform group-hover:scale-105" alt={uiCopy.yADALogo} />
            <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-indigo-200 bg-clip-text text-transparent hidden sm:inline">
              {t.welcomeTitle}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Workspace display */}
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[150px] truncate">
              {currentWorkspace?.name}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <ShieldAlert className="w-3 h-3" />
              {message(language, "SharedTopBar.readOnly")}
            </span>
          </div>
        </div>

        {/* Center: View Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-0.5 rounded-lg select-none">
          <button
            onClick={() => viewMode !== 'freeform' && toggleViewMode()}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${
              viewMode === 'freeform'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            title={message(language, "SharedTopBar.freeStyleView")}
          >
            <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline whitespace-nowrap">{message(language, "SharedTopBar.freeStyle")}</span>
          </button>
          <button
            onClick={() => viewMode !== 'sequence' && toggleViewMode()}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${
              viewMode === 'sequence'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            title={t.terms.sequenceDiagram}
          >
            <ListOrdered className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline whitespace-nowrap">{t.terms.sequenceDiagram}</span>
          </button>
        </div>

        {/* Right: Clone to Workspace Button */}
        <div>
          <button
            onClick={() => {
              fetchRecentWorkspaces();
              setShowPickerModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <FolderHeart className="w-3.5 h-3.5" />
            <span>{message(language, "SharedTopBar.saveToWorkspace")}</span>
          </button>
        </div>
      </header>

      {/* Workspace Picker Modal */}
      {showPickerModal && (
        <WorkspacePickerModal
          isOpen={showPickerModal}
          onClose={() => setShowPickerModal(false)}
          mode="add"
          diagramName={currentWorkspace?.name || (message(language, "SharedTopBar.sharedDiagram"))}
          onConfirm={handlePickerConfirm}
        />
      )}
    </>
  );
};
