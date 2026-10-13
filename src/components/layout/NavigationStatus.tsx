import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';

export function NavigationStatus() {
  const saving = useAppStore(s => s.isSaving);
  const saveError = useAppStore(s => s.saveError);
  const pending = useAppStore(s => s.navigationPending);
  const error = useAppStore(s => s.navigationError);
  const language = useAppStore(s => s.language);
  const t = translations[language];
  if (pending) return <div role="status" className="fixed inset-0 z-[10000] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center text-white"><span className="rounded-xl bg-slate-900 px-5 py-3">{t.navigationUi.opening}</span></div>;
  if (!saveError && !error) return null;
  return <aside role="alert" className="fixed bottom-4 left-4 right-4 z-[10000] rounded-xl border border-amber-400 bg-amber-50 text-amber-950 dark:bg-slate-900 dark:text-amber-200 p-4 shadow-xl text-sm">
    <p>{saveError ? t.navigationUi.savingFailed : error === 'COLLAB_NAVIGATION_LOCKED' ? t.navigationUi.locked : t.navigationUi.unavailable}</p>
    {saveError && <p className="text-xs mt-1">{t.navigationUi.retryHint}</p>}
    <div className="flex items-center gap-4 mt-2">
      {saveError && <button disabled={saving} onClick={() => void useAppStore.getState().manualSave()} className="rounded px-3 py-1.5 bg-amber-700 text-white disabled:opacity-50">{t.navigationUi.retry}</button>}
      <button onClick={() => useAppStore.setState({ saveError: null, navigationError: null })}>{t.close}</button>
      {saveError && <details><summary>{t.navigationUi.details}</summary><p>{saveError === 'CHANGES_NOT_SAVED' ? t.navigationUi.changed : saveError}</p></details>}
    </div>
  </aside>;
}
