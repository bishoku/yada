import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FileDown, Check, Film, Image, ChevronRight, Zap } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportGif: (fps: number, quality: number, scale: number, skipStatic: boolean) => void;
  onExportVideo: (fps: number, quality: 'low' | 'medium' | 'high', scale: number) => void;
}

type Tab = 'gif' | 'video';
type VideoQuality = 'low' | 'medium' | 'high';

const RESOLUTIONS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.50 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1.00 },
] as const;

const VIDEO_QUALITIES: { label: string; sublabel: string; value: VideoQuality }[] = [
  { label: 'Low',    sublabel: '~1 Mbps', value: 'low'    },
  { label: 'Medium', sublabel: '~3 Mbps', value: 'medium' },
  { label: 'High',   sublabel: '~8 Mbps', value: 'high'   },
];

const VIDEO_RESOLUTIONS = [
  { label: '1×',   sublabel: { en: 'Standard', tr: 'Standart' },    value: 1   },
  { label: '1.5×', sublabel: { en: 'HD',       tr: 'HD' },          value: 1.5 },
  { label: '2×',   sublabel: { en: 'Full HD',  tr: 'Full HD' },     value: 2   },
] as const;

export const GifExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExportGif,
  onExportVideo,
}) => {
  const language = useAppStore((s) => s.language);

  const [tab, setTab] = useState<Tab>('gif');

  // ── GIF settings ──
  const [gifFps,       setGifFps]       = useState(12);
  const [gifQuality,   setGifQuality]   = useState(70);
  const [gifScale,     setGifScale]     = useState(0.75);
  const [skipStatic,   setSkipStatic]   = useState(true);

  // ── Video settings ──
  const [videoFps,     setVideoFps]     = useState(30);
  const [videoQuality, setVideoQuality] = useState<VideoQuality>('medium');
  const [videoScale,   setVideoScale]   = useState(1);

  if (!isOpen) return null;

  const tr = (en: string, turk: string) => (language === 'tr' ? turk : en);

  // Rough GIF size hint based on settings
  const sizeHint = (() => {
    const factor = gifScale * gifScale * (gifQuality / 100) * (gifFps / 30);
    if (factor < 0.15) return tr('Very small (~<1 MB)', 'Çok küçük (~<1 MB)');
    if (factor < 0.35) return tr('Small (~1–3 MB)', 'Küçük (~1–3 MB)');
    if (factor < 0.65) return tr('Medium (~3–8 MB)', 'Orta (~3–8 MB)');
    return tr('Large (8+ MB)', 'Büyük (8+ MB)');
  })();

  const handleExport = () => {
    if (tab === 'gif') {
      onExportGif(gifFps, gifQuality, gifScale, skipStatic);
    } else {
      onExportVideo(videoFps, videoQuality, videoScale);
    }
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200 overflow-hidden">

        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <FileDown className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
            {tr('Export Animation', 'Animasyon Dışa Aktarma')}
          </h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            {tr('Configure and export your simulation', 'Simülasyonunuzu yapılandırın ve dışa aktarın')}
          </p>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setTab('gif')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all cursor-pointer border-b-2 ${
              tab === 'gif'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
                : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Image className="w-3.5 h-3.5" />
            GIF
          </button>
          <button
            onClick={() => setTab('video')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all cursor-pointer border-b-2 ${
              tab === 'video'
                ? 'border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-950/20'
                : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            {tr('Video (WebM)', 'Video (WebM)')}
            <span className="text-[9px] bg-violet-500/15 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded font-bold leading-none">
              NEW
            </span>
          </button>
        </div>

        {/* ── GIF Tab ── */}
        {tab === 'gif' && (
          <div className="px-5 py-4 space-y-4">

            {/* FPS */}
            <div>
              <label className="flex justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                <span>{tr('FPS (Frames Per Second)', 'FPS (Saniye Başına Kare)')}</span>
                <span className="text-indigo-500 font-bold">{gifFps}</span>
              </label>
              <input
                type="range" min="5" max="30" step="1"
                value={gifFps}
                onChange={(e) => setGifFps(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                <span>5 {tr('(Smaller file)', '(Küçük dosya)')}</span>
                <span>30 {tr('(Smoother)', '(Daha akıcı)')}</span>
              </div>
            </div>

            {/* Quality */}
            <div>
              <label className="flex justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                <span>{tr('Color Quality', 'Renk Kalitesi')}</span>
                <span className="text-indigo-500 font-bold">{gifQuality}%</span>
              </label>
              <input
                type="range" min="10" max="100" step="5"
                value={gifQuality}
                onChange={(e) => setGifQuality(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                <span>{tr('Low (16 colors)', 'Düşük (16 renk)')}</span>
                <span>{tr('High (256 colors)', 'Yüksek (256 renk)')}</span>
              </div>
            </div>

            {/* Resolution */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                {tr('Resolution Scale', 'Çözünürlük Ölçeği')}
              </label>
              <div className="grid grid-cols-4 gap-1">
                {RESOLUTIONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setGifScale(r.value)}
                    className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      gifScale === r.value
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-slate-400 mt-1">
                {tr('Halving resolution (~4× smaller file)', 'Çözünürlüğü yarıya indirmek (~4× küçük dosya)')}
              </p>
            </div>

            {/* Skip static frames */}
            <div className="flex items-center justify-between py-2.5 px-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60">
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  {tr('Skip Static Frames', 'Statik Kareleri Atla')}
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  {tr('Merges identical frames (best for diagrams)', 'Aynı kareleri birleştirir (diyagramlar için ideal)')}
                </p>
              </div>
              <button
                onClick={() => setSkipStatic(!skipStatic)}
                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer shrink-0 ${
                  skipStatic ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    skipStatic ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Size hint */}
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
              <ChevronRight className="w-3 h-3 shrink-0" />
              <span>{tr('Estimated output', 'Tahmini çıktı')}: <span className="text-slate-600 dark:text-slate-300 font-semibold">{sizeHint}</span></span>
            </div>
          </div>
        )}

        {/* ── Video Tab ── */}
        {tab === 'video' && (
          <div className="px-5 py-4 space-y-4">

            {/* FPS */}
            <div>
              <label className="flex justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                <span>{tr('FPS (Frames Per Second)', 'FPS (Saniye Başına Kare)')}</span>
                <span className="text-violet-500 font-bold">{videoFps}</span>
              </label>
              <input
                type="range" min="10" max="60" step="5"
                value={videoFps}
                onChange={(e) => setVideoFps(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-violet-500"
              />
              <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                <span>10</span>
                <span>60 {tr('(Smooth)', '(Akıcı)')}</span>
              </div>
            </div>

            {/* Video Quality */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                {tr('Bitrate / Quality', 'Bitrate / Kalite')}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {VIDEO_QUALITIES.map((q) => (
                  <button
                    key={q.value}
                    onClick={() => setVideoQuality(q.value)}
                    className={`flex flex-col items-center py-2 px-1 rounded-xl cursor-pointer transition-all border ${
                      videoQuality === q.value
                        ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span className="text-xs font-bold">{q.label}</span>
                    <span className={`text-[9px] mt-0.5 ${videoQuality === q.value ? 'text-violet-200' : 'text-slate-400'}`}>
                      {q.sublabel}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution Scale */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                {tr('Resolution Scale', 'Çözünürlük Ölçeği')}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {VIDEO_RESOLUTIONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setVideoScale(r.value)}
                    className={`flex flex-col items-center py-2 px-1 rounded-xl cursor-pointer transition-all border ${
                      videoScale === r.value
                        ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span className="text-xs font-bold">{r.label}</span>
                    <span className={`text-[9px] mt-0.5 ${videoScale === r.value ? 'text-violet-200' : 'text-slate-400'}`}>
                      {r.sublabel[language]}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-slate-400 mt-1">
                {tr(
                  'All resolutions use 2× supersampling for sharp text. Higher scales produce larger, crisper videos.',
                  'Tüm çözünürlükler net yazı için 2× süperörnekleme kullanır. Yüksek ölçek daha büyük ama daha keskin video üretir.'
                )}
              </p>
            </div>

            {/* Info box */}
            <div className="rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200/60 dark:border-violet-800/40 p-3 text-[10px] text-violet-700 dark:text-violet-400 space-y-1">
              <p className="font-semibold">{tr('About WebM export', 'WebM dışa aktarma hakkında')}</p>
              <p className="text-violet-600/80 dark:text-violet-500">
                {tr(
                  'Video files are 5–20× smaller than GIF at equal quality. Playback requires a modern browser or video player.',
                  'Video dosyaları aynı kalitede GIF\'ten 5–20× daha küçüktür. Oynatmak için modern bir tarayıcı veya medya oynatıcı gerekir.'
                )}
              </p>
              <p className="text-violet-600/80 dark:text-violet-500">
                {tr(
                  '⏱ Encoding takes approximately the same time as the animation duration.',
                  '⏱ Kodlama işlemi yaklaşık animasyon süresi kadar sürer.'
                )}
              </p>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
          >
            {language === 'tr' ? 'İptal' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            className={`px-4 py-2 text-white font-semibold rounded-xl text-xs cursor-pointer flex items-center gap-1.5 transition-colors ${
              tab === 'gif'
                ? 'bg-indigo-600 hover:bg-indigo-500'
                : 'bg-violet-600 hover:bg-violet-500'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            {tab === 'gif'
              ? tr('Export GIF', 'GIF Oluştur')
              : tr('Export Video', 'Video Oluştur')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
