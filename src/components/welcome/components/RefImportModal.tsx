import { Input } from '../../ui/Field';
import { useId } from 'react';
import { ModalSurface } from '../../ui/ModalSurface';
import { message } from '../../../i18n/messages';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link2, Loader2, X, AlertCircle, Lock, ArrowRight } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { translations } from '../../../i18n/translations';

interface RefImportModalProps {
  onClose: () => void;
}

export const RefImportModal: React.FC<RefImportModalProps> = ({ onClose }) => {
  const fieldPrefix = useId();
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
      const rawData = await (await import('../../../utils/shareUtils')).fetchShare(trimmed);

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
      const payload = await (await import('../../../utils/shareUtils')).extractShareData(encryptedData, pin);
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
          ? (message(language, "RefImportModal.incorrectPINCodePleaseTryAgain"))
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
      setError(message(language, "RefImportModal.diagramDataIsInvalidOrCorrupt"));
      setIsLoading(false);
    }
  };


  return createPortal(
    <ModalSurface label={message(language, "RefImportModal.importByReference")} onClose={onClose} width="28rem">
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
                {message(language, "RefImportModal.importByReference")}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {message(language, "RefImportModal.enterTheSharedDiagramReferenceCode")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
           aria-label={message(language, "common.close")}>
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
                  {message(language, "RefImportModal.thisDiagramIsPINProtectedEnterThe")}
                </p>
              </div>

              <Input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={message(language, "RefImportModal.enterPINCode")}
                className="w-full text-center"
                autoFocus data-dialog-autofocus=""
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
                    {message(language, "RefImportModal.unlockPreview")}
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Ref ID Entry */
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block" htmlFor={`${fieldPrefix}-modal-field-1`}>
                  {message(language, "RefImportModal.referenceCode")}
                </label>
                <Input
                  type="text"
                  value={refId}
                  onChange={(e) => {
                    setRefId(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFetch();
                  }}
                  placeholder={message(language, "RefImportModal.eGX7Kp2mNq")}
                  className="w-full font-mono text-center"
                  autoFocus data-dialog-autofocus=""
                  maxLength={12}
                 id={`${fieldPrefix}-modal-field-1`}/>
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
                    {message(language, "RefImportModal.loading")}
                  </>
                ) : (
                  <>
                    <Link2 className="w-5 h-5" />
                    {message(language, "RefImportModal.preview")}
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {message(language, "RefImportModal.enterTheRefValueAfterTheIn")}
              </p>
            </>
          )}
        </div>
      </div>
    </ModalSurface>,
    document.body
  );
};
