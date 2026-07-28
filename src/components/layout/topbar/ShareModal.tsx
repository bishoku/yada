import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Share2, Lock, Copy, CheckCircle2, AlertCircle, ExternalLink, Eye, Link2, Loader2 } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { uploadShare } from '../../../utils/shareUtils';
import { translations } from '../../../i18n/translations';

interface ShareModalProps {
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ onClose }) => {
  const logicalData = useAppStore((s) => s.logicalData);
  const visualData = useAppStore((s) => s.visualData);
  const currentView = useAppStore((s) => s.currentView);
  const language = useAppStore((s) => s.language);
  const isTr = language === 'tr';
  const t = translations[language];

  const [pin, setPin] = useState('');
  const [usePin, setUsePin] = useState(false);
  const [useEmbed, setUseEmbed] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Clear stale link when options change (don't auto-generate)
  useEffect(() => {
    setShareUrl('');
    setError(null);
    setCopied(false);
  }, [usePin, pin, useEmbed]);

  const generateLink = async () => {
    setIsGenerating(true);
    setError(null);
    setShareUrl('');
    setCopied(false);

    try {
      // Gather current workspace data to share
      const sharePayload = {
        logicalData,
        visualData,
        currentView
      };

      // Upload to Cloudflare KV and get a short reference ID
      const refId = await uploadShare(
        sharePayload,
        usePin && pin.length >= 4 ? pin : undefined
      );

      // In Tauri desktop app, window.location.origin is localhost — use production URL instead
      const isTauriApp = '__TAURI_INTERNALS__' in window;
      const baseUrl = isTauriApp
        ? 'https://bishoku.github.io/yada/'
        : window.location.origin + window.location.pathname;

      const embedParam = useEmbed ? '?embed=true' : '';
      const url = `${baseUrl}${embedParam}#ref=${refId}`;

      setShareUrl(url);
    } catch (err: any) {
      if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
        setError(t.cloudShareError);
      } else {
        setError(err.message || t.shareGenericError);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAndCopy = async () => {
    if (isGenerating) return;

    // If link already generated, just copy it
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy', err);
      }
      return;
    }

    // Generate and then copy
    await generateLink();
  };

  // Auto-copy after link is generated
  useEffect(() => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  }, [shareUrl]);

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t.shareTitle}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t.shareSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Options Section */}
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl space-y-4">
            
            {/* Embed Mode Checkbox */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useEmbed}
                onChange={(e) => setUseEmbed(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-500" />
                {isTr ? 'Gömme Modu (Clean Embed - ?embed=true)' : 'Embed Mode (Clean Embed - ?embed=true)'}
              </span>
            </label>

            {/* PIN Protection Checkbox */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={usePin}
                onChange={(e) => {
                    setUsePin(e.target.checked);
                    if (!e.target.checked) setPin('');
                }}
                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                {t.encryptWithPin}
              </span>
            </label>

            {usePin && (
              <div className="pl-8 animate-in slide-in-from-top-2">
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder={t.pinPlaceholder}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  maxLength={8}
                />
                {pin.length > 0 && pin.length < 4 ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                    {isTr ? `PIN en az 4 karakter olmalıdır (Mevcut: ${pin.length}/8)` : `PIN must be at least 4 characters (Current: ${pin.length}/8)`}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-2">
                    {t.pinHint}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Share Link Result */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.shareLinkLabel}
            </label>

            {error ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  {error}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {shareUrl && (
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 outline-none font-mono text-xs truncate"
                  />
                )}
                <button
                  onClick={handleGenerateAndCopy}
                  disabled={isGenerating || (usePin && pin.length < 4)}
                  className={`w-full px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition-all cursor-pointer
                    ${isGenerating || (usePin && pin.length < 4)
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                      : copied
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                    }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isTr ? 'Oluşturuluyor...' : 'Generating...'}
                    </>
                  ) : copied ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      {t.copiedBtn}
                    </>
                  ) : shareUrl ? (
                    <>
                      <Copy className="w-5 h-5" />
                      {t.copyBtn}
                    </>
                  ) : (
                    <>
                      <Link2 className="w-5 h-5" />
                      {isTr ? 'Oluştur ve Kopyala' : 'Generate & Copy'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-lg flex items-start gap-2">
            <ExternalLink className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              {t.shareNotice}
            </p>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
};
