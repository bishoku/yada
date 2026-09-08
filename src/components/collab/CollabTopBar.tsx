import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Users, Copy, Check, LogOut, Clock } from 'lucide-react';

export const CollabTopBar: React.FC = () => {
  const isCollabActive = useAppStore((s) => s.isCollabActive);
  const collabRoomId = useAppStore((s) => s.collabRoomId);
  const collabRole = useAppStore((s) => s.collabRole);
  const collabPeers = useAppStore((s) => s.collabPeers);
  const collabTimeRemainingMs = useAppStore((s) => s.collabTimeRemainingMs);
  const setCollabTimeRemaining = useAppStore((s) => s.setCollabTimeRemaining);
  const leaveCollabSession = useAppStore((s) => s.leaveCollabSession);
  const openConfirm = useAppStore((s) => s.openConfirm);
  const language = useAppStore((s) => s.language);
  const isTr = language === 'tr';

  const [copied, setCopied] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    if (!isCollabActive) return;

    const interval = setInterval(() => {
      setCollabTimeRemaining(Math.max(0, collabTimeRemainingMs - 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isCollabActive, collabTimeRemainingMs, setCollabTimeRemaining]);

  // Auto-leave and persist when room timer expires
  useEffect(() => {
    if (isCollabActive && collabTimeRemainingMs <= 0) {
      leaveCollabSession();
    }
  }, [isCollabActive, collabTimeRemainingMs, leaveCollabSession]);

  if (!isCollabActive) return null;

  const peers = Object.values(collabPeers);
  const totalUsers = 1 + peers.length;

  const minutes = Math.floor(collabTimeRemainingMs / 60000);
  const seconds = Math.floor((collabTimeRemainingMs % 60000) / 1000);
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleCopyLink = async () => {
    const isTauriApp = '__TAURI_INTERNALS__' in window;
    const baseUrl = isTauriApp
      ? 'https://bishoku.github.io/yada/'
      : window.location.origin + window.location.pathname;

    const shareUrl = `${baseUrl}#collab=${collabRoomId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy collab url:', e);
    }
  };

  const handleLeave = async () => {
    const confirmed = await openConfirm({
      title: isTr ? 'Ortak Çalışma Oturumundan Ayrıl' : 'Leave Collaboration Session',
      message: isTr
        ? 'Oturumdan ayrılmak istediğinize emin misiniz? Yapılan değişiklikler yerel çalışma alanınıza kaydedilecektir.'
        : 'Are you sure you want to leave? Changes made will be saved to your local workspace.',
      confirmText: isTr ? 'Ayrıl' : 'Leave',
      cancelText: isTr ? 'Vazgeç' : 'Cancel',
      type: 'warning',
    });

    if (confirmed) {
      await leaveCollabSession();
      // Clean URL hash
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
      <div className="bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-700/80 rounded-full px-4 py-2 shadow-2xl flex items-center gap-3.5 text-white">
        {/* Live Indicator */}
        <div className="flex items-center gap-2 pr-1">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold tracking-wide uppercase text-emerald-400">
            {isTr ? 'Canlı' : 'Live'}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-700" />

        {/* User Avatars & Count */}
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex -space-x-1.5 items-center">
            {/* Host / Self Badge */}
            <div
              className="w-6 h-6 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
              style={{ backgroundColor: '#3B82F6' }}
              title={isTr ? 'Siz (Oturum Başlatan)' : 'You'}
            >
              {collabRole === 'host' ? 'H' : 'Y'}
            </div>

            {/* Remote Peers */}
            {peers.map((peer) => (
              <div
                key={peer.peerId}
                className="w-6 h-6 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                style={{ backgroundColor: peer.color }}
                title={peer.name}
              >
                {peer.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
          <span className="text-xs font-medium text-slate-300 ml-1">
            {totalUsers}/4
          </span>
        </div>

        <div className="h-4 w-px bg-slate-700" />

        {/* Timer */}
        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>{formattedTime}</span>
        </div>

        <div className="h-4 w-px bg-slate-700" />

        {/* Copy Invite Link */}
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600/60 text-xs font-medium text-slate-200 transition-colors"
          title={isTr ? 'Davet linkini kopyala' : 'Copy invite link'}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">{isTr ? 'Kopyalandı' : 'Copied'}</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-300" />
              <span>{isTr ? 'Davet Linki' : 'Invite'}</span>
            </>
          )}
        </button>

        {/* Leave Button */}
        <button
          onClick={handleLeave}
          className="p-1.5 rounded-full hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
          title={isTr ? 'Oturumu Bitir / Ayrıl' : 'Leave session'}
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
