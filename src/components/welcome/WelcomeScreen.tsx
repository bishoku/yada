import { useState } from 'react';
import { Settings, Plus, ArrowRight, Monitor, Server, Database, Play, Upload, Activity, Link2, ExternalLink, Info } from 'lucide-react';
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
import { useExperienceCopy } from '../../i18n/useExperienceCopy';
import { interpolate, getStorageDescription } from '../../i18n/formatters';
import { StorageService } from '../../services/storage';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Menu } from '../ui/Menu';
import { Dialog } from '../ui/Dialog';
import { Toast } from '../ui/Toast';

export const WelcomeScreen = () => {
  const welcome = useWelcome();
  const {
    recentWorkspaces, language, theme, changeLanguage, changeTheme, googleUser, t,
    name, setName, description, setDescription, error, setError, loading,
    showPrefModal, setShowPrefModal, activeTextModalAdapter, setActiveTextModalAdapter,
    setImportState, setViewMode, workspaceToDelete, setWorkspaceToDelete,
    workspaceToRename, setWorkspaceToRename, renameName, setRenameName, importConflicts,
    handleExport, handleImport, confirmDelete, handleRenameWorkspace, handleCreate, handleQuickStart,
    handleLoadRecent, onGoogleSignIn, needsPermission, handleGrantPermission, handleResolveConflicts, handleCancelConflicts,
  } = welcome;
  const copy = useExperienceCopy();
  const [showRefImport,setShowRefImport] = useState(false);
  const [showCreate,setShowCreate] = useState(false);
  const base = import.meta.env.BASE_URL;
  return <main className="yada-welcome">
    <div className="yada-welcome-content">
      <header className="yada-welcome-nav">
        <div className="flex items-center gap-2.5"><img src={`${base}pwa-icon.png`} width={32} height={32} alt="YADA" /><span className="font-display text-xl font-semibold tracking-tight">YADA</span></div>
        <IconButton label={t.appPrefTitle} onClick={() => setShowPrefModal(true)}><Settings size={19} aria-hidden="true" /></IconButton>
      </header>
      {error && !showCreate && <Toast variant="error" onDismiss={() => setError(null)}>{error}</Toast>}
      <section className="yada-start-card" aria-labelledby="welcome-title">
        <div className="yada-start-copy">
          <p className="yada-eyebrow">{copy.welcomeEyebrow}</p>
          <h1 id="welcome-title">{copy.welcomeTitle}</h1>
          <p className="yada-start-description">{copy.welcomeDescription}</p>
          <div className="yada-start-actions">
            <Button busy={loading} onClick={() => { void handleQuickStart(); }}><Plus size={18} aria-hidden="true" />{copy.newDiagram}</Button>
            <Button variant="secondary" disabled={loading} onClick={() => { void handleQuickStart(true); }}><Play size={17} aria-hidden="true" />{copy.example}</Button>
            <Menu label={copy.import} locale={language === 'tr' ? 'tr-TR' : 'en'} disabled={loading} items={[
              { id:'project', label:t.commonUi.importWorkspace, icon:<Upload />, onSelect:() => { void handleImport(); } },
              ...availableAdapters.map(adapter => ({ id:adapter.id, label:interpolate(t.commonUi.importAdapter,{name:adapter.id === 'mermaid-sequence' ? copy.mermaidAdapter : adapter.name}), icon:<Activity />, onSelect:() => setActiveTextModalAdapter(adapter) })),
              { id:'reference',label:copy.importReference,icon:<Link2 />,onSelect:()=>setShowRefImport(true) },
            ]} />
          </div>
          <Button variant="ghost" disabled={loading} className="yada-named-workspace" onClick={() => { setError(null); setShowCreate(true); }}>{copy.namedWorkspace}<ArrowRight size={15} aria-hidden="true" /></Button>
        </div>
        <div className="yada-flow-preview" aria-hidden="true">
          <div className="yada-flow-nodes">
            <div><Monitor size={23} /><span>{copy.client}</span></div><ArrowRight size={18} />
            <div><Server size={23} /><span>{copy.server}</span></div><ArrowRight size={18} />
            <div><Database size={23} /><span>{copy.database}</span></div>
          </div>
          <p>{copy.exampleCaption}</p>
        </div>
      </section>
      <WorkspaceList recentWorkspaces={recentWorkspaces} loading={loading} language={language} needsPermission={needsPermission} onGrantPermission={handleGrantPermission} onLoadRecent={handleLoadRecent} onRenameWorkspace={workspace => { setWorkspaceToRename(workspace); setRenameName(workspace.name); }} onExport={handleExport} onDelete={setWorkspaceToDelete} />
      <footer className="yada-welcome-footer">
        <p><Info size={15} aria-hidden="true" />{getStorageDescription(StorageService.getMode(),language)}</p>
        <a href={`${base}diagram.html`} target="_blank" rel="noopener noreferrer">{copy.moreExamples}<ExternalLink size={14} aria-hidden="true" /></a>
      </footer>
    </div>
    {showCreate && <Dialog title={t.createWorkspace} onClose={() => { if (!loading) setShowCreate(false); }}>
      <CreateWorkspaceForm name={name} setName={value => { setName(value); setError(null); }} description={description} setDescription={setDescription} loading={loading} error={error} language={language} onSubmit={handleCreate} onGoogleSignIn={onGoogleSignIn} googleUser={googleUser} />
    </Dialog>}
    <PreferencesModal isOpen={showPrefModal} onClose={() => setShowPrefModal(false)} language={language} theme={theme} onChangeLanguage={changeLanguage} onChangeTheme={changeTheme} />
    <DeleteConfirmationModal workspace={workspaceToDelete} onClose={() => setWorkspaceToDelete(null)} onConfirm={confirmDelete} language={language} />
    <RenameWorkspaceModal workspace={workspaceToRename} renameName={renameName} setRenameName={setRenameName} loading={loading} onClose={() => { setWorkspaceToRename(null); setRenameName(''); }} onSubmit={handleRenameWorkspace} language={language} />
    <ImportConflictsModal importConflicts={importConflicts} onResolve={handleResolveConflicts} onCancel={handleCancelConflicts} language={language} />
    {activeTextModalAdapter && <TextImportModal adapterId={activeTextModalAdapter.id} adapterName={activeTextModalAdapter.id === 'mermaid-sequence' ? copy.mermaidAdapter : activeTextModalAdapter.name} onClose={() => setActiveTextModalAdapter(null)} onSubmit={(adapterId,data) => { setActiveTextModalAdapter(null); setImportState(adapterId,data); setViewMode('import-preview'); }} />}
    {showRefImport && <RefImportModal onClose={() => setShowRefImport(false)} />}
  </main>;
};
