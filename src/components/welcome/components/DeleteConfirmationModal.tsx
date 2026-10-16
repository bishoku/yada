import type { WorkspaceMeta } from '../../../types';
import { translations } from '../../../i18n/translations';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/Button';

interface DeleteConfirmationModalProps {
  workspace: WorkspaceMeta | null;
  onClose: () => void;
  onConfirm: () => void;
  language: 'tr' | 'en';
}

export function DeleteConfirmationModal({ workspace, onClose, onConfirm, language }: DeleteConfirmationModalProps) {
  if (!workspace) return null;
  const t = translations[language];
  return <Dialog role="alertdialog" title={t.deleteWorkspace} onClose={onClose}
    description={`"${workspace.name}" ${t.deleteWorkspaceConfirm}`}>
    <footer className="flex flex-wrap justify-end gap-3 mt-6">
      <Button autoFocus variant="secondary" onClick={onClose}>{t.cancel}</Button>
      <Button variant="danger" onClick={onConfirm}>{t.deletePermanently}</Button>
    </footer>
  </Dialog>;
}
