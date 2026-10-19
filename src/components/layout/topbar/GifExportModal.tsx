import type { CaptureFraming } from '../../../utils/captureFraming';
import { useId } from 'react';
import { ModalSurface } from '../../ui/ModalSurface';
import { message } from '../../../i18n/messages';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FileDown, Check, Film, Image, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportGif: (fps: number, quality: number, scale: number) => void;
  framing?: CaptureFraming;
  onExportVideo: (fps: number, quality: 'low' | 'medium' | 'high', scale: number, mode: 'canvas' | 'screen') => void;
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
  { label: '1.5×', sublabel: { en: 'Sharper', tr: 'Daha net' },          value: 1.5 },
  { label: '2×',   sublabel: { en: 'Extra sharp', tr: 'En net' },     value: 2   },
] as const;

export const GifExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExportGif,
  onExportVideo,
  framing = 'viewport',
}) => {
  const fieldPrefix = useId();
  const language = useAppStore((s) => s.language);

  const [tab, setTab] = useState<Tab>('gif');

  // ── GIF settings ──
  const [gifFps,       setGifFps]       = useState(12);
  const [gifQuality,   setGifQuality]   = useState(70);
  const [gifScale,     setGifScale]     = useState(0.75);

  // ── Video settings ──
  const [videoFps,     setVideoFps]     = useState(30);
  const [videoQuality, setVideoQuality] = useState<VideoQuality>('medium');
  const [videoScale,   setVideoScale]   = useState(1);
  const videoEngine = 'screen' as const;



  if (!isOpen) return null;



  // Rough GIF size hint based on settings
  const sizeHint = (() => {
    const factor = gifScale * gifScale * (gifQuality / 100) * (gifFps / 30);
    if (factor < 0.15) return message(language, "GifExportModal.verySmall1MB");
    if (factor < 0.35) return message(language, "GifExportModal.small13MB");
    if (factor < 0.65) return message(language, "GifExportModal.medium38MB");
    return message(language, "GifExportModal.large8MB");
  })();

  const handleExport = () => {
    if (tab === 'gif') {
      onExportGif(gifFps, gifQuality, gifScale);
    } else {
      onExportVideo(videoFps, videoQuality, videoScale, videoEngine);
    }
    onClose();
  };

  return createPortal(
    <ModalSurface label={message(language, "GifExportModal.exportAnimation")} onClose={onClose} width="24rem">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200 overflow-hidden">

        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <FileDown className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
            {message(language, "GifExportModal.exportAnimation")}
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {message(language, "GifExportModal.configureAndExportYourSimulation")}
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
            Video (MP4)
          </button>
        </div>

        {/* ── GIF Tab ── */}
        {tab === 'gif' && (
          <div className="px-5 py-4 space-y-4">

            {/* FPS */}
            <div>
              <label className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2" htmlFor={`${fieldPrefix}-modal-field-1`}>
                <span>{message(language, "GifExportModal.fPSFramesPerSecond")}</span>
                <span className="text-indigo-500 font-bold">{gifFps}</span>
              </label>
              <input
                type="range" min="5" max="30" step="1"
                value={gifFps}
                onChange={(e) => setGifFps(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
               id={`${fieldPrefix}-modal-field-1`}/>
              <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                <span>5 {message(language, "GifExportModal.smallerFile")}</span>
                <span>30 {message(language, "GifExportModal.smoother")}</span>
              </div>
            </div>

            {/* Quality */}
            <div>
              <label className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2" htmlFor={`${fieldPrefix}-modal-field-2`}>
                <span>{message(language, "GifExportModal.colorQuality")}</span>
                <span className="text-indigo-500 font-bold">{gifQuality}%</span>
              </label>
              <input
                type="range" min="10" max="100" step="5"
                value={gifQuality}
                onChange={(e) => setGifQuality(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
               id={`${fieldPrefix}-modal-field-2`}/>
              <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                <span>{message(language, "GifExportModal.low16Colors")}</span>
                <span>{message(language, "GifExportModal.high256Colors")}</span>
              </div>
            </div>

            {/* Resolution */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                {message(language, "GifExportModal.resolutionScale")}
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
              <p className="text-xs text-slate-400 mt-1">
                {message(language, "GifExportModal.halvingResolution4SmallerFile")}
              </p>
            </div>

            {/* Size hint */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <ChevronRight className="w-3 h-3 shrink-0" />
              <span>{message(language, "GifExportModal.estimatedOutput")}: <span className="text-slate-600 dark:text-slate-300 font-semibold">{sizeHint}</span></span>
            </div>
          </div>
        )}

        {/* ── Video Tab ── */}
        {tab === 'video' && (
          <div className="px-5 py-4 space-y-4">

            {/* FPS */}
            <div>
              <label className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2" htmlFor={`${fieldPrefix}-modal-field-3`}>
                <span>{message(language, "GifExportModal.fPSFramesPerSecond")}</span>
                <span className="text-violet-500 font-bold">{videoFps}</span>
              </label>
              <input
                type="range" min="10" max="60" step="5"
                value={videoFps}
                onChange={(e) => setVideoFps(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-violet-500"
               id={`${fieldPrefix}-modal-field-3`}/>
              <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                <span>10</span>
                <span>60 {message(language, "GifExportModal.smooth")}</span>
              </div>
            </div>

            {/* Video Quality */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                {message(language, "GifExportModal.bitrateQuality")}
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
                    <span className="text-xs font-bold">{message(language, `quality.${q.value}`)}</span>
                    <span className={`text-xs mt-0.5 ${videoQuality === q.value ? 'text-violet-200' : 'text-slate-400'}`}>
                      {q.sublabel}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution Scale */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                {message(language, "GifExportModal.resolutionScale")}
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
                    <span className={`text-xs mt-0.5 ${videoScale === r.value ? 'text-violet-200' : 'text-slate-400'}`}>
                      {r.sublabel[language]}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {message(language, "GifExportModal.allResolutionsUse2SupersamplingForSharp")}
              </p>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">{message(language,'capture.framing')}: {message(language,framing === 'viewport' ? 'capture.viewport' : 'capture.diagram')}</p>
            {/* Info box */}
            <div className="rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200/60 dark:border-violet-800/40 p-3 text-xs text-violet-700 dark:text-violet-400 space-y-1">
              <p className="font-semibold">
                {message(language, "GifExportModal.aboutDOMScreenCapture")}
              </p>
              <p className="text-violet-600/80 dark:text-violet-500">
                {message(language, "GifExportModal.capturesTheExactDOMViewFrameBy")}
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
            {message(language, "GifExportModal.cancel")}
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
              ? message(language, "GifExportModal.exportGIF")
              : message(language, "GifExportModal.exportVideo")}
          </button>
        </div>
      </div>
    </ModalSurface>,
    document.body
  );
};
