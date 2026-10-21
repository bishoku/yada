import { Input } from '../../ui/Field';
import { useId } from 'react';
import { ModalSurface } from '../../ui/ModalSurface';
import { useUiCopy } from '../../../i18n/useUiCopy';
import { message } from '../../../i18n/messages';
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Code2, Copy, CheckCircle2, Loader2, X, ExternalLink, Cloud, Link2, AlertTriangle, ShieldCheck, FolderHeart, Eye } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { prepareShareData, uploadShare } from '../../../utils/shareUtils';
import { translations } from '../../../i18n/translations';

interface EmbedSnippetModalProps {
  onClose: () => void;
}

type StorageMode = 'direct' | 'cloud';
type DisplayMode = 'interactive' | 'preview';

export const EmbedSnippetModal: React.FC<EmbedSnippetModalProps> = ({ onClose }) => {
  const fieldPrefix = useId();
  const uiCopy = useUiCopy();
  const logicalData = useAppStore((s) => s.logicalData);
  const visualData = useAppStore((s) => s.visualData);
  const currentView = useAppStore((s) => s.currentView);
  const language = useAppStore((s) => s.language);

  const t = translations[language];

  // Options
  const [storageMode, setStorageMode] = useState<StorageMode>('direct');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('interactive'); // default: allows saving to workspace

  // Stored payloads
  const [compressedData, setCompressedData] = useState<string>('');
  const [cloudRefId, setCloudRefId] = useState<string>('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState<'snippet' | 'url' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Size options
  const [width, setWidth] = useState('100%');
  const [height, setHeight] = useState('600px');
  const [autoplay, setAutoplay] = useState(true);

  const getBaseUrl = useCallback(() => {
    const isTauriApp = '__TAURI_INTERNALS__' in window;
    return isTauriApp
      ? 'https://bishoku.github.io/yada/'
      : window.location.origin + window.location.pathname;
  }, []);

  // Pre-compress for Direct URL (hash-based #share=...) immediately on mount
  useEffect(() => {
    const compress = async () => {
      try {
        const sharePayload = { logicalData, visualData, currentView };
        const compressed = await prepareShareData(sharePayload);
        setCompressedData(compressed);
      } catch (err: any) {
        console.error('Failed to compress direct URL data:', err);
        setError(message(language, 'common.operationFailed'));
      }
    };
    compress();
  }, [logicalData, visualData, currentView]);

  // Handle switching to Cloudflare KV short URL mode
  const handleSelectCloudMode = async () => {
    setStorageMode('cloud');
    setError(null);
    if (cloudRefId) return; // Already uploaded

    setIsGenerating(true);
    try {
      const sharePayload = { logicalData, visualData, currentView };
      const refId = await uploadShare(sharePayload);
      setCloudRefId(refId);
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

  const handleSelectDirectMode = () => {
    setStorageMode('direct');
    setError(null);
  };



  // Construct final URL dynamically
  const baseUrl = getBaseUrl();
  const embedParam = displayMode === 'preview' ? '?embed=true' : '';

  let activeUrl = '';
  if (storageMode === 'direct' && compressedData) {
    activeUrl = `${baseUrl}${embedParam}#share=${compressedData}`;
  } else if (storageMode === 'cloud' && cloudRefId) {
    const query = displayMode === 'preview' ? `?embed=true&ref=${cloudRefId}` : `?ref=${cloudRefId}`;
    activeUrl = `${baseUrl}${query}`;
  }

  const iframeSnippet = activeUrl
    ? `<iframe
  src="${activeUrl}"
  width="${width}"
  height="${height}"
  frameborder="0"
  allow="autoplay; fullscreen"
  style="border: none; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.12);"
  loading="lazy"
  title="${logicalData.nodes?.[0]?.name || 'YADA Diagram'}"
></iframe>`
    : '';

  const handleCopy = async (type: 'snippet' | 'url') => {
    const text = type === 'snippet' ? iframeSnippet : activeUrl;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return createPortal(
    <ModalSurface label={message(language, "EmbedSnippetModal.iframeEmbedCodeShare")} onClose={onClose} width="42rem">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Code2 className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {message(language, "EmbedSnippetModal.iframeEmbedCodeShare")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {message(language, "EmbedSnippetModal.embedThisDiagramIntoYourWebsiteOr")}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label={message(language, "common.close")}>
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Section 1: Display Mode (Interactive / Add to Workspace vs Clean Preview) */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              {message(language, "EmbedSnippetModal.displayUserAccess")}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Option 1: Can Add to Workspace (Default) */}
              <button
                type="button"
                onClick={() => setDisplayMode('interactive')}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  displayMode === 'interactive'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FolderHeart className={`w-4 h-4 ${displayMode === 'interactive' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {message(language, "EmbedSnippetModal.canAddToWorkspace")}
                  </span>
                  <span className="ml-auto text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-semibold">
                    {message(language, "EmbedSnippetModal.default")}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
                  {message(language, "EmbedSnippetModal.viewersCanInspectTheSimulationAndSave")}
                </p>
              </button>

              {/* Option 2: Clean Preview Only */}
              <button
                type="button"
                onClick={() => setDisplayMode('preview')}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  displayMode === 'preview'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Eye className={`w-4 h-4 ${displayMode === 'preview' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {message(language, "EmbedSnippetModal.previewOnly")}
                  </span>
                  <span className="ml-auto text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-semibold">
                    ?embed=true
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
                  {message(language, "EmbedSnippetModal.playsPureCanvasAnimationTopBarAnd")}
                </p>
              </button>
            </div>
          </div>

          {/* Section 2: Storage & URL Mode Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              {message(language, "EmbedSnippetModal.dataStorageURLFormat")}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Option 1: Direct URL (Default) */}
              <button
                type="button"
                onClick={handleSelectDirectMode}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  storageMode === 'direct'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Link2 className={`w-4 h-4 ${storageMode === 'direct' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {message(language, "EmbedSnippetModal.directURLRecommended")}
                  </span>
                  <span className="ml-auto text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-semibold">
                    {message(language, "EmbedSnippetModal.permanent")}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
                  {message(language, "EmbedSnippetModal.dataIsEmbeddedDirectlyInURLHash")}
                </p>
              </button>

              {/* Option 2: Short URL (Cloudflare KV) */}
              <button
                type="button"
                onClick={handleSelectCloudMode}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  storageMode === 'cloud'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Cloud className={`w-4 h-4 ${storageMode === 'cloud' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {message(language, "EmbedSnippetModal.shortURL")}
                  </span>
                  <span className="ml-auto text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-semibold">
                    Cloudflare KV
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
                  {message(language, "EmbedSnippetModal.generatesAShortLinkStoredTemporarilyOn")}
                </p>
              </button>
            </div>

            {/* Storage Info Notes */}
            {storageMode === 'cloud' && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  {message(language, "EmbedSnippetModal.shortLinksAreHostedTemporarilyOnCloudflare")}
                </span>
              </div>
            )}

            {storageMode === 'direct' && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  {message(language, "EmbedSnippetModal.diagramDataIsCompletelyContainedInThe")}
                </span>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Loading (when generating Cloudflare short URL) */}
          {isGenerating && (
            <div className="flex items-center justify-center py-8 gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              <span className="text-sm text-slate-500">
                {message(language, "EmbedSnippetModal.generatingCloudflareKVShortLink")}
              </span>
            </div>
          )}

          {activeUrl && !isGenerating && (
            <>
              {/* Size Controls */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider" htmlFor={`${fieldPrefix}-modal-field-1`}>
                    {message(language, "EmbedSnippetModal.width")}
                  </label>
                  <Input
                    type="text"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="w-full"
                    placeholder={uiCopy["100Or800px"]}
                   id={`${fieldPrefix}-modal-field-1`}/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider" htmlFor={`${fieldPrefix}-modal-field-2`}>
                    {message(language, "EmbedSnippetModal.height")}
                  </label>
                  <Input
                    type="text"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full"
                    placeholder="600px"
                   id={`${fieldPrefix}-modal-field-2`}/>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-1.5">
                    <input
                      type="checkbox"
                      checked={autoplay}
                      onChange={(e) => setAutoplay(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      {message(language, "EmbedSnippetModal.autoplay")}
                    </span>
                  </label>
                </div>
              </div>

              {/* Code Preview */}
              <div className="relative group">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {uiCopy.hTMLSnippet}
                  </span>
                  <button
                    onClick={() => handleCopy('snippet')}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    {copied === 'snippet' ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied === 'snippet' ? (message(language, "EmbedSnippetModal.copied")) : (message(language, "EmbedSnippetModal.copy"))}
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-950 text-xs text-emerald-400 font-mono overflow-x-auto leading-relaxed border border-slate-800">
                  <code>{iframeSnippet}</code>
                </pre>
              </div>

              {/* Direct URL */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {message(language, "EmbedSnippetModal.iframeSourceURL")}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopy('url')}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      {copied === 'url' ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied === 'url' ? (message(language, "EmbedSnippetModal.copied")) : (message(language, "EmbedSnippetModal.copy"))}
                    </button>
                    <a
                      href={activeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {message(language, "EmbedSnippetModal.open")}
                    </a>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400 break-all border border-slate-200 dark:border-slate-700 max-h-24 overflow-y-auto">
                  {activeUrl}
                </div>
              </div>

              {/* Live Preview */}
              <div>
                <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                  {message(language, "EmbedSnippetModal.livePreview")}
                </span>
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800" style={{ height: '300px' }}>
                  <iframe
                    key={activeUrl}
                    src={activeUrl}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allow="autoplay; fullscreen"
                    style={{ border: 'none' }}
                    loading="lazy"
                    title={uiCopy.embedPreview}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {message(language, "EmbedSnippetModal.pasteTheSnippetIntoYourHTMLTo")}
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {message(language, "EmbedSnippetModal.close")}
          </button>
        </div>
      </div>
    </ModalSurface>,
    document.body
  );
};

EmbedSnippetModal.displayName = 'EmbedSnippetModal';
