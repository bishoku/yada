import { Input } from '../ui/Field';
import { useId } from 'react';
import { ModalSurface } from '../ui/ModalSurface';
import { useUiCopy } from '../../i18n/useUiCopy';
import { message } from '../../i18n/messages';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Folder, Plus, Check } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';

interface WorkspacePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'copy' | 'move' | 'add';
  diagramName: string;
  currentWorkspacePath?: string;
  onConfirm: (
    targetWorkspacePath: string | null,
    targetWorkspaceName: string,
    isNew: boolean,
    newWorkspaceName?: string,
    targetDiagramName?: string
  ) => Promise<void>;
}

export const WorkspacePickerModal: React.FC<WorkspacePickerModalProps> = ({
  isOpen,
  onClose,
  mode,
  diagramName,
  currentWorkspacePath,
  onConfirm,
}) => {
  const fieldPrefix = useId();
  const uiCopy = useUiCopy();
  const language = useAppStore((s) => s.language);
  const recentWorkspaces = useAppStore((s) => s.recentWorkspaces);
  const t = translations[language];




  // Exclude current workspace from copy/move options
  const selectableWorkspaces = currentWorkspacePath
    ? recentWorkspaces.filter(ws => ws.path !== currentWorkspacePath)
    : recentWorkspaces;

  const [isNewWorkspace, setIsNewWorkspace] = useState(selectableWorkspaces.length === 0);
  const [selectedWorkspacePath, setSelectedWorkspacePath] = useState<string>(
    selectableWorkspaces[0]?.path || ''
  );
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [targetDiagName, setTargetDiagName] = useState(diagramName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getTitle = () => {
    if (mode === 'copy') return t.copyDiagram;
    if (mode === 'move') return t.moveDiagram;
    return t.addDiagramToWorkspace;
  };

  const getConfirmText = () => {
    if (loading) return message(language, "WorkspacePickerModal.processing");
    if (mode === 'copy') return t.copyDiagram;
    if (mode === 'move') return t.moveDiagram;
    return t.addDiagramToWorkspace;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedDiagName = targetDiagName.trim();
    if (!trimmedDiagName) {
      setError(message(language, "WorkspacePickerModal.pleaseEnterADiagramName"));
      return;
    }

    if (isNewWorkspace) {
      const trimmedWsName = newWorkspaceName.trim();
      if (!trimmedWsName) {
        setError(message(language, "WorkspacePickerModal.pleaseEnterANewWorkspaceName"));
        return;
      }
      setLoading(true);
      try {
        await onConfirm(null, trimmedWsName, true, trimmedWsName, trimmedDiagName);
        onClose();
      } catch (err: any) {
        setError(message(language, 'common.operationFailed'));
      } finally {
        setLoading(false);
      }
    } else {
      if (!selectedWorkspacePath) {
        setError(message(language, "WorkspacePickerModal.pleaseSelectAWorkspace"));
        return;
      }
      const selectedWs = selectableWorkspaces.find(ws => ws.path === selectedWorkspacePath);
      if (!selectedWs) {
        setError(message(language, "WorkspacePickerModal.workspaceNotFound"));
        return;
      }
      setLoading(true);
      try {
        await onConfirm(selectedWorkspacePath, selectedWs.name, false, undefined, trimmedDiagName);
        onClose();
      } catch (err: any) {
        setError(message(language, 'common.operationFailed'));
      } finally {
        setLoading(false);
      }
    }
  };

  return createPortal(
    <ModalSurface label={getTitle()} onClose={onClose} width="28rem">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl transition-all animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Folder className="w-5 h-5 text-indigo-500" />
            {getTitle()}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
           aria-label={message(language, "common.close")}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Diagram Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5" htmlFor={`${fieldPrefix}-modal-field-1`}>
              {message(language, "WorkspacePickerModal.diagramName")}
            </label>
            <Input
              type="text"
              value={targetDiagName}
              onChange={(e) => setTargetDiagName(e.target.value)}
              disabled={loading}
              maxLength={100}
              placeholder={uiCopy.eGSystemArchitecturePlan}
              className="w-full"
              required
             id={`${fieldPrefix}-modal-field-1`}/>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800 my-2" />

          {/* Destination Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t.selectTargetWorkspace}
            </label>

            {selectableWorkspaces.length > 0 && (
              <div className="flex gap-4 mb-2">
                <button
                  type="button"
                  onClick={() => setIsNewWorkspace(false)}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    !isNewWorkspace
                      ? 'bg-indigo-550 border-indigo-550 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" />
                  {message(language, "WorkspacePickerModal.existingWorkspace")}
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewWorkspace(true)}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isNewWorkspace
                      ? 'bg-indigo-550 border-indigo-550 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t.newWorkspace}
                </button>
              </div>
            )}

            {!isNewWorkspace && selectableWorkspaces.length > 0 ? (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-950/20">
                {selectableWorkspaces.map((ws) => (
                  <label
                    key={ws.path}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                      selectedWorkspacePath === ws.path
                        ? 'bg-white dark:bg-slate-900 border-indigo-500 text-slate-850 dark:text-slate-100 shadow-sm border-indigo-550'
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="radio"
                        name="destinationWorkspace"
                        value={ws.path}
                        checked={selectedWorkspacePath === ws.path}
                        onChange={() => setSelectedWorkspacePath(ws.path)}
                        className="sr-only"
                      />
                      <Folder className={`w-4 h-4 shrink-0 ${selectedWorkspacePath === ws.path ? 'text-indigo-500' : 'text-slate-400'}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{ws.name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{ws.path}</p>
                      </div>
                    </div>
                    {selectedWorkspacePath === ws.path && (
                      <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            ) : null}

            {isNewWorkspace && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-150">
                <Input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  disabled={loading}
                  maxLength={50}
                  placeholder={t.workspaceNamePlaceholder}
                  className="w-full"
                  required
                />
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-600 dark:text-rose-450">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
             data-dialog-autofocus="">
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-slate-100 font-semibold rounded-xl text-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              {loading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {getConfirmText()}
            </button>
          </div>
        </form>
      </div>
    </ModalSurface>,
    document.body
  );
};
