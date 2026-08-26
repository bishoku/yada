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
  const logicalData = useAppStore((s) => s.logicalData);
  const visualData = useAppStore((s) => s.visualData);
  const currentView = useAppStore((s) => s.currentView);
  const language = useAppStore((s) => s.language);
  const isTr = language === 'tr';
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
        setError(err.message || 'Direct URL encoding error');
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Construct final URL dynamically
  const baseUrl = getBaseUrl();
  const embedParam = displayMode === 'preview' ? '?embed=true' : '';
  
  let activeUrl = '';
  if (storageMode === 'direct' && compressedData) {
    activeUrl = `${baseUrl}${embedParam}#share=${compressedData}`;
  } else if (storageMode === 'cloud' && cloudRefId) {
    activeUrl = `${baseUrl}${embedParam}#ref=${cloudRefId}`;
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
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
                {isTr ? 'Iframe Embed Kodu & Paylaşım' : 'Iframe Embed Code & Share'}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {isTr ? 'Diyagramı web sitenize veya dokümantasyonunuza ekleyin' : 'Embed this diagram into your website or docs'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          
          {/* Section 1: Display Mode (Interactive / Add to Workspace vs Clean Preview) */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              {isTr ? 'Görünüm & Kullanıcı Erişimi' : 'Display & User Access'}
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
                    {isTr ? 'Çalışma Alanına Eklenebilir' : 'Can Add to Workspace'}
                  </span>
                  <span className="ml-auto text-[9px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-semibold">
                    {isTr ? 'Varsayılan' : 'Default'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  {isTr
                    ? 'Kullanıcı simülasyonu izleyebilir ve "Çalışma Alanıma Kaydet" ile kendi alanına ekleyebilir.'
                    : 'Viewers can inspect the simulation and save it to their own workspace.'}
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
                    {isTr ? 'Sadece Önizleme' : 'Preview Only'}
                  </span>
                  <span className="ml-auto text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-semibold">
                    ?embed=true
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  {isTr
                    ? 'Yalnızca saf tuval animasyonu oynatılır. Üst bar ve ekleme butonu gizlenir.'
                    : 'Plays pure canvas animation. Top bar and save buttons are omitted.'}
                </p>
              </button>
            </div>
          </div>

          {/* Section 2: Storage & URL Mode Selection */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              {isTr ? 'Veri Saklama & URL Formatı' : 'Data Storage & URL Format'}
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
                    {isTr ? 'Doğrudan URL (Önerilen)' : 'Direct URL (Recommended)'}
                  </span>
                  <span className="ml-auto text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-semibold">
                    {isTr ? 'Kalıcı' : 'Permanent'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  {isTr
                    ? 'Veri doğrudan URL hash içine gömülür. Sunucusuzdur, süresi asla dolmaz.'
                    : 'Data is embedded directly in URL hash. Serverless, never expires.'}
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
                    {isTr ? 'Kısa URL' : 'Short URL'}
                  </span>
                  <span className="ml-auto text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-semibold">
                    Cloudflare KV
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  {isTr
                    ? 'Kısa link üretir. Cloudflare KV üzerinde geçici süreli saklanır.'
                    : 'Generates a short link. Stored temporarily on Cloudflare KV.'}
                </p>
              </button>
            </div>

            {/* Storage Info Notes */}
            {storageMode === 'cloud' && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  {isTr
                    ? 'Kısa bağlantılar Cloudflare KV üzerinde geçici olarak barındırılır. Kalıcı dokümantasyon için "Doğrudan URL" önerilir.'
                    : 'Short links are hosted temporarily on Cloudflare KV. For permanent documentation, "Direct URL" is recommended.'}
                </span>
              </div>
            )}

            {storageMode === 'direct' && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 flex items-start gap-2 text-[11px] text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  {isTr
                    ? 'Diyagram verisi tamamen URL içinde saklanır. Üçüncü parti sunucuya yüklenmez, bağımsız ve kalıcıdır.'
                    : 'Diagram data is completely contained in the URL hash. Independent and permanent.'}
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
                {isTr ? 'Cloudflare KV kısa linki oluşturuluyor...' : 'Generating Cloudflare KV short link...'}
              </span>
            </div>
          )}

          {activeUrl && !isGenerating && (
            <>
              {/* Size Controls */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                    {isTr ? 'Genişlik' : 'Width'}
                  </label>
                  <input
                    type="text"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="100% or 800px"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                    {isTr ? 'Yükseklik' : 'Height'}
                  </label>
                  <input
                    type="text"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="600px"
                  />
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
                      {isTr ? 'Otomatik Oynat' : 'Autoplay'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Code Preview */}
              <div className="relative group">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    HTML Snippet
                  </span>
                  <button
                    onClick={() => handleCopy('snippet')}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    {copied === 'snippet' ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied === 'snippet' ? (isTr ? 'Kopyalandı!' : 'Copied!') : (isTr ? 'Kopyala' : 'Copy')}
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-950 text-[11px] text-emerald-400 font-mono overflow-x-auto leading-relaxed border border-slate-800">
                  <code>{iframeSnippet}</code>
                </pre>
              </div>

              {/* Direct URL */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {isTr ? 'Iframe Kaynak URL' : 'Iframe Source URL'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopy('url')}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      {copied === 'url' ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied === 'url' ? (isTr ? 'Kopyalandı!' : 'Copied!') : (isTr ? 'Kopyala' : 'Copy')}
                    </button>
                    <a
                      href={activeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {isTr ? 'Aç' : 'Open'}
                    </a>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400 break-all border border-slate-200 dark:border-slate-700 max-h-24 overflow-y-auto">
                  {activeUrl}
                </div>
              </div>

              {/* Live Preview */}
              <div>
                <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                  {isTr ? 'Canlı Önizleme' : 'Live Preview'}
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
                    title="Embed Preview"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {isTr ? 'Snippet\'i HTML\'ye yapıştırarak kullanın' : 'Paste the snippet into your HTML to embed'}
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {isTr ? 'Kapat' : 'Close'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

EmbedSnippetModal.displayName = 'EmbedSnippetModal';
