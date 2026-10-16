import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { applySavedUpdate, ensureSavedForUpdate } from '../../services/pwa/updateGuard';
import { reliabilityCopy } from '../../i18n/reliabilityCopy';
import { Toast } from '../ui/Toast';
import { Button } from '../ui/Button';

export function PwaStatus() {
  const language = useAppStore(s => s.language);
  const t = reliabilityCopy[language];
  const [offline, setOffline] = useState(!navigator.onLine);
  const [notice, setNotice] = useState<'ready' | 'connected' | 'failed' | 'updateFailed' | null>(null);
  const [update, setUpdate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const activating = useRef(false);
  const activationTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const running = useRef(false);
  const enabled = import.meta.env.PROD && import.meta.env.VITE_PROFILE_STARTUP !== 'true' && !import.meta.env.VITE_TARGET && !(window as any).__TAURI_INTERNALS__ && window.parent === window;
  useEffect(() => {
    if (!enabled || !('serviceWorker' in navigator)) return;
    let disposed = false;
    let watched: ServiceWorker | null = null;
    let reg: ServiceWorkerRegistration | undefined;
    const status = () => {
      if (disposed) return;
      if (reg?.waiting) setUpdate(true);
      else if (watched?.state === 'activated' && !navigator.serviceWorker.controller) setNotice('ready');
    };
    const watch = () => {
      watched?.removeEventListener('statechange', status);
      watched = reg?.installing ?? null;
      watched?.addEventListener('statechange', status);
      status();
    };
    const check = () => { if (navigator.onLine && document.visibilityState === 'visible') void reg?.update().then(status).catch(() => {}); };
    const online = () => { setOffline(false); setNotice('connected'); check(); };
    const offline = () => { setOffline(true); setNotice(null); };
    let controlled = !!navigator.serviceWorker.controller;
    const control = async () => {
      if (disposed) return;
      // Other open tabs retain their unsaved document and request their own safe reload.
      if (!controlled) { controlled = true; setNotice('ready'); return; }
      setUpdate(true);
      if (!activating.current) return;
      activating.current = false;
      clearTimeout(activationTimer.current);
      try {
        if (!await applySavedUpdate(ensureSavedForUpdate, () => window.location.reload())) setNotice('updateFailed');
      } catch { setNotice('updateFailed'); }
      finally { setBusy(false); running.current = false; }
    };
    navigator.serviceWorker.addEventListener('controllerchange', control);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    document.addEventListener('visibilitychange', check);
    const interval = window.setInterval(check, 30 * 60 * 1000);
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' }).then(value => {
      if (disposed) return;
      reg = value; registration.current = value;
      reg.addEventListener('updatefound', watch);
      watch();
      check();
    }).catch(() => { if (!disposed) setNotice('failed'); });
    return () => {
      disposed = true; window.clearInterval(interval); clearTimeout(activationTimer.current);
      watched?.removeEventListener('statechange', status);
      reg?.removeEventListener('updatefound', watch);
      navigator.serviceWorker.removeEventListener('controllerchange', control);
      window.removeEventListener('online', online); window.removeEventListener('offline', offline);
      document.removeEventListener('visibilitychange', check);
    };
  }, [enabled, attempt]);
  if (!enabled) return null;
  const apply = async () => {
    if (running.current) return;
    running.current = true; setBusy(true);
    try {
      const saved = await applySavedUpdate(ensureSavedForUpdate, () => {
        const waiting = registration.current?.waiting;
        if (waiting) {
          activating.current = true;
          activationTimer.current = setTimeout(() => {
            activating.current = false; running.current = false; setBusy(false); setNotice('updateFailed');
          }, 15000);
          waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        else window.location.reload();
      });
      if (!saved) setNotice('updateFailed');
    } catch { activating.current = false; setNotice('updateFailed'); }
    finally { if (!activating.current) { setBusy(false); running.current = false; } }
  };
  const error = notice === 'failed' || notice === 'updateFailed';
  return <div className="fixed bottom-4 left-4 right-4 z-[9000] flex flex-col gap-2 pointer-events-none [&>*]:pointer-events-auto max-w-xl mx-auto">
    {offline && <div className="yada-toast" role="status">{t.offline}</div>}
    {(notice || update) && <Toast variant={error ? 'error' : 'success'} onDismiss={() => { setNotice(null); setUpdate(false); }} action={update ? <Button busy={busy} disabled={offline} onClick={() => void apply()}>{t.apply}</Button> : notice === 'failed' ? <Button onClick={() => { setNotice(null); setAttempt(value => value + 1); }}>{t.retry}</Button> : notice === 'connected' ? <Button busy={busy} onClick={() => void apply()}>{t.reload}</Button> : undefined}>
      {notice && error ? t[notice] : update ? t.update : notice ? t[notice] : null}
    </Toast>}
  </div>;
}
