import React, { useState } from 'react';
import { Settings, FolderOpen, FolderPlus } from 'lucide-react';
import { useWelcome } from './hooks/useWelcome';
import { WorkspaceList } from './components/WorkspaceList';
import { CreateWorkspaceForm } from './components/CreateWorkspaceForm';
import { PreferencesModal } from './components/PreferencesModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { RenameWorkspaceModal } from './components/RenameWorkspaceModal';
import { ImportConflictsModal } from './components/ImportConflictsModal';
import { TextImportModal } from './TextImportModal';
import { RefImportModal } from './components/RefImportModal';
import { availableAdapters } from '../../adapters';

export const WelcomeScreen: React.FC = () => {
  const {
    recentWorkspaces,
    language,
    theme,
    changeLanguage,
    changeTheme,
    googleUser,
    t,
    name,
    setName,
    description,
    setDescription,
    error,
    setError,
    loading,
    showPrefModal,
    setShowPrefModal,
    showImportMenu,
    setShowImportMenu,
    activeTextModalAdapter,
    setActiveTextModalAdapter,
    setImportState,
    setViewMode,
    workspaceToDelete,
    setWorkspaceToDelete,
    workspaceToRename,
    setWorkspaceToRename,
    renameName,
    setRenameName,
    importConflicts,
    handleExport,
    handleImport,
    confirmDelete,
    handleRenameWorkspace,
    handleCreate,
    handleLoadRecent,
    onGoogleSignIn,
    needsPermission,
    handleGrantPermission,
    handleResolveConflicts,
    handleCancelConflicts,
  } = useWelcome();

  const [showRefImport, setShowRefImport] = useState(false);
  const [mobileTab, setMobileTab] = useState<'workspaces' | 'create'>('workspaces');

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-2 sm:p-4 md:p-6 lg:p-8 relative overflow-x-hidden overflow-y-auto select-none transition-colors duration-300">
      {/* Decorative gradients - strictly isolated inside overflow-hidden to prevent horizontal/vertical scroll */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 dark:bg-violet-600/15 blur-[120px]" />
      </div>

      {/* Preferences Toggle Button */}
      <button
        onClick={() => setShowPrefModal(true)}
        className="absolute top-3 right-3 sm:top-5 sm:right-5 p-2 sm:p-2.5 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-slate-800/80 rounded-xl cursor-pointer shadow-xs transition-all flex items-center gap-1.5 z-30"
        title={t.appPrefTitle}
      >
        <Settings className="w-4 h-4" />
        <span className="text-xs font-semibold hidden xs:inline sm:inline">{t.appPrefTitle}</span>
      </button>

      {/* Main Container Card */}
      <div className="w-full max-w-5xl bg-white/85 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-xl dark:shadow-2xl overflow-hidden flex flex-col z-10 h-full max-h-[calc(100vh-2rem)] md:h-[580px] md:max-h-[85vh] transition-all">
        {/* Mobile Tab Navigation (< md) */}
        <div className="flex md:hidden p-1.5 bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 shrink-0 gap-1.5">
          <button
            type="button"
            onClick={() => setMobileTab('workspaces')}
            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileTab === 'workspaces'
                ? 'bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>{(t as any).tabWorkspaces || 'Çalışma Alanları'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('create')}
            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileTab === 'create'
                ? 'bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>{(t as any).tabCreateNew || 'Yeni Oluştur'}</span>
          </button>
        </div>

        {/* Main Content: 2-Column on Desktop (md:), Tab-Switched on Mobile */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Left Side: Recent Workspaces */}
          <WorkspaceList
            className={mobileTab === 'workspaces' ? 'flex' : 'hidden md:flex'}
            recentWorkspaces={recentWorkspaces}
            loading={loading}
            language={language}
            showImportMenu={showImportMenu}
            setShowImportMenu={setShowImportMenu}
            availableAdapters={availableAdapters}
            needsPermission={needsPermission}
            onGrantPermission={handleGrantPermission}
            onLoadRecent={handleLoadRecent}
            onRenameWorkspace={(ws) => {
              setWorkspaceToRename(ws);
              setRenameName(ws.name);
            }}
            onExport={handleExport}
            onDelete={setWorkspaceToDelete}
            onImportDproj={handleImport}
            onSelectAdapter={(adapter) => {
              if (adapter.importMethod === 'text-modal') {
                setActiveTextModalAdapter(adapter);
              } else {
                setActiveTextModalAdapter(adapter);
              }
            }}
            onRefImport={() => setShowRefImport(true)}
          />

          {/* Right Side: Create Workspace Form */}
          <CreateWorkspaceForm
            className={mobileTab === 'create' ? 'flex' : 'hidden md:flex'}
            name={name}
            setName={(val) => {
              setName(val);
              setError(null);
            }}
            description={description}
            setDescription={setDescription}
            loading={loading}
            error={error}
            language={language}
            onSubmit={handleCreate}
            onGoogleSignIn={onGoogleSignIn}
            googleUser={googleUser}
          />
        </div>
      </div>

      {/* Global Preferences Modal */}
      <PreferencesModal
        isOpen={showPrefModal}
        onClose={() => setShowPrefModal(false)}
        language={language}
        theme={theme}
        onChangeLanguage={changeLanguage}
        onChangeTheme={changeTheme}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        workspace={workspaceToDelete}
        onClose={() => setWorkspaceToDelete(null)}
        onConfirm={confirmDelete}
        language={language}
      />

      {/* Rename Workspace Modal */}
      <RenameWorkspaceModal
        workspace={workspaceToRename}
        renameName={renameName}
        setRenameName={setRenameName}
        loading={loading}
        onClose={() => {
          setWorkspaceToRename(null);
          setRenameName('');
        }}
        onSubmit={handleRenameWorkspace}
        language={language}
      />

      {/* Import Conflict Resolution Modal */}
      <ImportConflictsModal
        importConflicts={importConflicts}
        onResolve={handleResolveConflicts}
        onCancel={handleCancelConflicts}
        language={language}
      />

      {/* Adapter Text Paste Import Modal */}
      {activeTextModalAdapter && (
        <TextImportModal
          adapterId={activeTextModalAdapter.id}
          adapterName={activeTextModalAdapter.name}
          onClose={() => setActiveTextModalAdapter(null)}
          onSubmit={(adapterId, data) => {
            setActiveTextModalAdapter(null);
            setImportState(adapterId, data);
            setViewMode('import-preview');
          }}
        />
      )}

      {/* Ref Import Modal */}
      {showRefImport && (
        <RefImportModal onClose={() => setShowRefImport(false)} />
      )}
    </div>
  );
};
