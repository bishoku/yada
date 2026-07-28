import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link2, Loader2, X, AlertCircle, Lock, ArrowRight } from 'lucide-react';
import { fetchShare, extractShareData } from '../../../utils/shareUtils';
import { useAppStore } from '../../../store/useAppStore';
import { translations } from '../../../i18n/translations';

interface RefImportModalProps {
  onClose: () => void;
}

export const RefImportModal: React.FC<RefImportModalProps> = ({ onClose }) => {
  const language = useAppStore((s) => s.language);
  const t = translations[language];
  const loadImportPreview = useAppStore((s) => s.loadImportPreview);
  const setViewMode = useAppStore((s) => s.setViewMode);

  const [refId, setRefId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PIN flow state
  const [needsPin, setNeedsPin] = useState(false);
  const [pin, setPin] = useState('');
  const [encryptedData, setEncryptedData] = useState<string | null>(null);

  const handleFetch = async () => {
    const trimmed = refId.trim();
    if (!trimmed || trimmed.length < 6) return;

    setIsLoading(true);
    setError(null);
    setNeedsPin(false);
    setEncryptedData(null);

    try {
      const rawData = await fetchShare(trimmed);

      // PIN-encrypted data
      if (rawData.startsWith('ENC:')) {
        setEncryptedData(rawData);
        setNeedsPin(true);
        setIsLoading(false);
        return;
      }

      // Parse and load preview
      const payload = JSON.parse(rawData);
      applyPreview(payload);
    } catch (err: any) {
      if (err.message === 'SHARE_EXPIRED') {
        setError(t.shareExpiredError);
      } else if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
        setError(t.cloudShareError);
      } else {
        setError(err.message || t.shareGenericError);
      }
      setIsLoading(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4 || !encryptedData) return;

    setIsLoading(true);
    setError(null);

    try {
      const payload = await extractShareData(encryptedData, pin);
      applyPreview(payload);
    } catch (err: any) {
      const isDecryptionError = err.message && (
        err.message.toLowerCase().includes('decrypt') ||
        err.message.toLowerCase().includes('cipher') ||
        err.message.toLowerCase().includes('invalid pin') ||
        err.message.toLowerCase().includes('key')
      );
      setError(
        isDecryptionError
          ? (language === 'tr' ? 'Yanlış PIN kodu. Lütfen tekrar deneyin.' : 'Incorrect PIN code. Please try again.')
          : (err.message || t.shareGenericError)
      );
      setIsLoading(false);
    }
  };

  const applyPreview = (payload: any) => {
    if (payload.logicalData && payload.visualData) {
      if (payload.currentView) {
        useAppStore.getState().setView(payload.currentView);
      }
      loadImportPreview(payload.logicalData, payload.visualData);
      setViewMode('import-preview');
      onClose();
    } else {
      setError(language === 'tr' ? 'Diyagram verisi geçersiz veya bozuk.' : 'Diagram data is invalid or corrupt.');
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {language === 'tr' ? 'Referans ile İçe Aktar' : 'Import by Reference'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {language === 'tr' ? 'Paylaşılan diyagram referans kodunu girin' : 'Enter the shared diagram reference code'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {needsPin ? (
            /* PIN Entry */
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                  <Lock className="w-6 h-6 text-amber-500" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'tr'
                    ? 'Bu diyagram PIN ile korunuyor. Görüntülemek için PIN kodunu girin.'
                    : 'This diagram is PIN-protected. Enter the PIN to view it.'}
                </p>
              </div>

              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={language === 'tr' ? 'PIN Kodunu Girin' : 'Enter PIN Code'}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-center text-xl tracking-[0.5em] focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                autoFocus
              />

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={pin.length < 4 || isLoading}
                className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    {language === 'tr' ? 'Kilidi Aç ve Önizle' : 'Unlock & Preview'}
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Ref ID Entry */
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {language === 'tr' ? 'Referans Kodu' : 'Reference Code'}
                </label>
                <input
                  type="text"
                  value={refId}
                  onChange={(e) => {
                    setRefId(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFetch();
                  }}
                  placeholder={language === 'tr' ? 'Örn: x7Kp2mNq' : 'e.g. x7Kp2mNq'}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-mono text-center text-lg tracking-widest focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  autoFocus
                  maxLength={12}
                />
              </div>

              {error && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">{error}</p>
                </div>
              )}

              <button
                onClick={handleFetch}
                disabled={!refId.trim() || refId.trim().length < 6 || isLoading}
                className={`w-full px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium transition-all cursor-pointer
                  ${!refId.trim() || refId.trim().length < 6 || isLoading
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                  }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {language === 'tr' ? 'Yükleniyor...' : 'Loading...'}
                  </>
                ) : (
                  <>
                    <Link2 className="w-5 h-5" />
                    {language === 'tr' ? 'Önizle' : 'Preview'}
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {language === 'tr'
                  ? 'Paylaşım linkindeki # işaretinden sonraki ref= değerini girin'
                  : 'Enter the ref= value after the # in the share link'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
