import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import { Users, Clock, Copy, Check, Sparkles, X, Loader2 } from 'lucide-react';

export const StartCollabModal: React.FC = () => {
  const isOpen = useAppStore((s) => s.isStartCollabModalOpen);
  const setOpen = useAppStore((s) => s.setStartCollabModalOpen);
  const startCollabSession = useAppStore((s) => s.startCollabSession);
  const isCollabActive = useAppStore((s) => s.isCollabActive);
  const collabRoomId = useAppStore((s) => s.collabRoomId);
  const language = useAppStore((s) => s.language);
  const isTr = language === 'tr';

  const [duration, setDuration] = useState<number>(30);
  const [isStarting, setIsStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);

  const activeDiagramId = useAppStore((s) => s.activeDiagramId);
  const currentWorkspace = useAppStore((s) => s.currentWorkspace);
  const diagrams = useAppStore((s) => s.diagrams);
  const activeDiagram = diagrams.find((d) => d.id === activeDiagramId);
  const hasActiveDiagram = !!(activeDiagramId && activeDiagram && currentWorkspace);

  if (!isOpen) return null;

  const handleStart = async () => {
    if (!hasActiveDiagram) return;
    setIsStarting(true);
    try {
      const roomId = await startCollabSession(duration);
      setCreatedRoomId(roomId);
    } catch (err) {
      console.error('Failed to start session:', err);
    } finally {
      setIsStarting(false);
    }
  };

  const getShareUrl = (roomId: string) => {
    const isTauriApp = '__TAURI_INTERNALS__' in window;
    const baseUrl = isTauriApp
      ? 'https://bishoku.github.io/yada/'
      : window.location.origin + window.location.pathname;
    return `${baseUrl}#collab=${roomId}`;
  };

  const handleCopy = async (roomId: string) => {
    const url = getShareUrl(roomId);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const activeRoom = createdRoomId || (isCollabActive ? collabRoomId : null);

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {isTr ? 'Canlı Ortak Çalışma Alanı' : 'Live Collaboration Space'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isTr ? 'Figma tarzı eşzamanlı mimari çizim (Maks. 4 kişi)' : 'Figma-like simultaneous diagramming (Max 4 peers)'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {!activeRoom ? (
            <>
              {/* Active Diagram Lock Target */}
              {hasActiveDiagram ? (
                <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{isTr ? 'Çalışma Alanı:' : 'Workspace:'}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{currentWorkspace.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{isTr ? 'Aktif Diyagram:' : 'Active Diagram:'}</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 truncate max-w-[200px]">{activeDiagram.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-blue-100 dark:border-blue-900/40">
                    🔒 {isTr
                      ? 'Oturum boyunca tüm kullanıcılar bu diyagram üzerinde kilitli çalışır.'
                      : 'All participants will be locked to this diagram during the session.'}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-700 dark:text-amber-300 font-medium">
                  ⚠️ {isTr
                    ? 'Ortak çalışma başlatmak için lütfen önce bir diyagram açın.'
                    : 'Please open a diagram before starting a live session.'}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  {isTr ? 'Oturum Süresi' : 'Session Duration'}
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[15, 30, 45].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDuration(mins)}
                      className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                        duration === mins
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {mins} {isTr ? 'dakika' : 'mins'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  {isTr ? 'Zero-Knowledge P2P Güvenliği' : 'Zero-Knowledge P2P Security'}
                </div>
                <p>
                  {isTr
                    ? 'Diyagram verileriniz ve hareketleriniz doğrudan tarayıcılar arasında (WebRTC) akar. Sunucuda hiçbir çizim verisi saklanmaz.'
                    : 'Your diagram and canvas actions flow directly peer-to-peer via WebRTC. Zero diagram data is saved on servers.'}
                </p>
              </div>

              <button
                onClick={handleStart}
                disabled={isStarting || !hasActiveDiagram}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isTr ? 'Oda Başlatılıyor...' : 'Starting Space...'}</span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    <span>{isTr ? 'Oturumu Başlat' : 'Start Session'}</span>
                  </>
                )}
              </button>
            </>
          ) : (
            /* Active Room Share Card */
            <div className="space-y-4">
              <div className="text-center space-y-1 py-1">
                <div className="inline-flex p-2.5 rounded-full bg-emerald-500/10 text-emerald-500 mb-1">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {isTr ? 'Ortak Çalışma Alanı Açıldı!' : 'Collaboration Space Ready!'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isTr ? 'Bu linki diğer 3 ekip arkadaşınızla paylaşarak birlikte çizebilirsiniz.' : 'Share this invite link with up to 3 teammates to draw together.'}
                </p>
              </div>

              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="text"
                  readOnly
                  value={getShareUrl(activeRoom)}
                  className="bg-transparent text-xs text-slate-700 dark:text-slate-300 px-2 flex-1 outline-none truncate font-mono"
                />
                <button
                  onClick={() => handleCopy(activeRoom)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>{isTr ? 'Kopyalandı' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{isTr ? 'Kopyala' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium transition-colors"
              >
                {isTr ? 'Canvas\'a Dön' : 'Return to Canvas'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
