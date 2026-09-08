import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import { Users, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

const PEER_COLORS = [
  '#F97316', // Orange
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
];

export const CollabJoinModal: React.FC = () => {
  const isOpen = useAppStore((s) => s.isJoinCollabModalOpen);
  const pendingJoinRoomId = useAppStore((s) => s.pendingJoinRoomId);
  const setJoinCollabModalOpen = useAppStore((s) => s.setJoinCollabModalOpen);
  const joinCollabSession = useAppStore((s) => s.joinCollabSession);
  const googleUser = useAppStore((s) => s.googleUser);
  const language = useAppStore((s) => s.language);
  const isTr = language === 'tr';

  const [name, setName] = useState('');
  const [color, setColor] = useState(PEER_COLORS[0]);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect #collab=<roomId> from URL on mount
  useEffect(() => {
    const href = window.location.href;
    const match = href.match(/collab=([A-Za-z0-9_\-.]+)/);
    if (match && match[1]) {
      setJoinCollabModalOpen(true, match[1]);
    }
  }, [setJoinCollabModalOpen]);

  // Pre-fill name from Google user or default
  useEffect(() => {
    if (googleUser?.name) {
      setName(googleUser.name);
    } else if (!name) {
      setName(isTr ? 'Misafir Mimar' : 'Guest Architect');
    }
  }, [googleUser, isTr]);

  if (!isOpen || !pendingJoinRoomId) return null;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isJoining) return;

    setIsJoining(true);
    setError(null);

    try {
      await joinCollabSession(pendingJoinRoomId, name.trim(), color);
      setJoinCollabModalOpen(false, null);
    } catch (err: any) {
      console.error('Failed to join room:', err);
      if (err?.message?.includes('ROOM_FULL') || err?.status === 403) {
        setError(isTr ? 'Bu oturum dolu (maksimum 4 kişi).' : 'This session is full (maximum 4 participants).');
      } else if (err?.message?.includes('ROOM_EXPIRED') || err?.status === 410) {
        setError(isTr ? 'Bu oturumun süresi dolmuş veya kapatılmış.' : 'This session has expired or ended.');
      } else {
        setError(isTr ? 'Odaya bağlanılamadı. Lütfen tekrar deneyin.' : 'Failed to connect to room. Please try again.');
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleCancel = () => {
    setJoinCollabModalOpen(false, null);
    // Remove hash
    window.history.replaceState(null, '', window.location.pathname);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 text-center space-y-2 border-b border-slate-100 dark:border-slate-700/60">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {isTr ? 'Ortak Çalışmaya Davet Edildiniz!' : 'You Are Invited to Collaborate!'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isTr
              ? 'Diyagramı gerçek zamanlı olarak ekip arkadaşlarınızla birlikte düzenleyin.'
              : 'Edit and draw diagrams in real-time together with your team.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleJoin} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isTr ? 'Adınız / Takma Adınız' : 'Your Name / Nickname'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isTr ? 'Örn: Barış' : 'e.g. Alex'}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isTr ? 'İmleç ve Vurgu Renginiz' : 'Cursor & Highlight Color'}
            </label>
            <div className="flex items-center gap-3">
              {PEER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? 'scale-115 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ring-slate-400' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium transition-colors"
            >
              {isTr ? 'Vazgeç' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isJoining || !name.trim()}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isTr ? 'Bağlanılıyor...' : 'Connecting...'}</span>
                </>
              ) : (
                <>
                  <span>{isTr ? 'Oturuma Katıl' : 'Join Session'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
