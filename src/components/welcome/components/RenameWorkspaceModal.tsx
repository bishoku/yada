import { Button } from '../../ui/Button';
import { Input } from '../../ui/Field';
import { useId } from 'react';
import { ModalSurface } from '../../ui/ModalSurface';
import React from 'react';
import { Edit } from 'lucide-react';
import { WorkspaceMeta } from '../../../types';
import { translations } from '../../../i18n/translations';

interface RenameWorkspaceModalProps {
  workspace: WorkspaceMeta | null;
  renameName: string;
  setRenameName: (name: string) => void;
  loading: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  language: 'tr' | 'en';
}

export const RenameWorkspaceModal: React.FC<RenameWorkspaceModalProps> = ({
  workspace,
  renameName,
  setRenameName,
  loading,
  onClose,
  onSubmit,
  language,
}) => {
  const fieldPrefix = useId();
  if (!workspace) return null;

  const t = translations[language];

  return (
    <ModalSurface label={t.renameWorkspace} onClose={onClose} width="24rem">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl transition-all animate-in zoom-in-95 duration-200">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <Edit className="w-5 h-5 text-indigo-500" />
          {t.renameWorkspace}
        </h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5" htmlFor={`${fieldPrefix}-modal-field-1`}>
              {t.newName}
            </label>
            <Input
              type="text"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              disabled={loading}
              maxLength={50}
              className="w-full"
              required
             id={`${fieldPrefix}-modal-field-1`}/>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary"
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
             data-dialog-autofocus="">
              {t.cancel}
            </Button>
            <Button
              type="submit"
              disabled={loading || !renameName.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
            >
              {t.save}
            </Button>
          </div>
        </form>
      </div>
    </ModalSurface>
  );
};
