import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/useTranslation';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';

export function GlobalConfirmAlertModal() {
  const confirm = useAppStore(state => state.confirmState);
  const alert = useAppStore(state => state.alertState);
  const closeConfirm = useAppStore(state => state.closeConfirm);
  const closeAlert = useAppStore(state => state.closeAlert);
  const t = useTranslation();

  if (confirm?.isOpen) return <Dialog key="confirm" role="alertdialog" title={confirm.title}
    description={confirm.message} onClose={() => closeConfirm(false)}>
    <footer className="flex flex-wrap justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
      <Button autoFocus variant="secondary" onClick={() => closeConfirm(false)}>{confirm.cancelText || t.cancel}</Button>
      <Button variant={confirm.type === 'danger' ? 'danger' : 'primary'} onClick={() => closeConfirm(true)}>
        {confirm.confirmText || t.commonUi.confirm}
      </Button>
    </footer>
  </Dialog>;

  if (alert?.isOpen) return <Dialog key="alert" role="alertdialog" title={alert.title}
    description={alert.message} onClose={closeAlert}>
    <footer className="flex justify-end mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
      <Button autoFocus onClick={closeAlert}>{alert.okText || t.commonUi.ok}</Button>
    </footer>
  </Dialog>;

  return null;
}
