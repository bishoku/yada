import { captureFontCSS } from './captureFonts';
import { applyCaptureFraming, type CaptureFraming } from './captureFraming';
import { prepareDocumentIcons } from './captureAssets';
import { canvasBackground, hideCaptureElements } from './capturePolicy';
import { withAnimatedCapture } from '../services/animatedCapture';
import { withCaptureLock } from '../services/captureLock';
import { message } from '../i18n/messages';
import { simulationClock } from '../store/simulationClock';
import { withFullSequenceRendering } from '../services/sequenceCapture';
import { toPng, toSvg } from 'html-to-image';
// @ts-ignore — gifenc ships ESM-only; types are inferred at runtime
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { useAppStore } from '../store/useAppStore';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { isTauri } from '../services/storage';
import { injectPngDataUrlMetadata, injectSvgMetadata } from './imageMetadata';
import {
  renderDiagramFrame,
  calculateSchedules,
  calculateViewportBounds,
  type Schedule,
} from './canvasRenderer';

// ─────────────────────────────────────────────────────────────

const shouldExcludeNode = (domNode: HTMLElement): boolean => {
  if (!domNode || !domNode.classList) return false;
  return (
    domNode.classList.contains('react-flow__controls') ||
    domNode.classList.contains('react-flow__panel') ||
    domNode.classList.contains('react-flow__minimap') ||
    domNode.classList.contains('react-flow__attribution') ||
    domNode.classList.contains('export-exclude') ||
    domNode.classList.contains('react-flow__handle') ||
    domNode.classList.contains('react-flow__resize-control') || domNode.classList.contains('react-flow__edgeupdater')
  );
};

// ─────────────────────────────────────────────────────────────
// PNG Export (with Embedded Scene Data)
// ─────────────────────────────────────────────────────────────
const generatePngDataUrlInternal = async (containerSelector: string, embedMetadata = true, framing: CaptureFraming = 'viewport'): Promise<string> => {
  const node = document.querySelector(containerSelector) as HTMLElement;
  if (!node) {
    throw new Error('Diagram container not found.');
  }


  await applyCaptureFraming(framing);
  const originalLang = node.getAttribute?.('lang') ?? null;
  node.setAttribute?.('lang',useAppStore.getState().language);
  const restoreElements = hideCaptureElements();


  // Wait for the browser to apply the injected stylesheet to the DOM before capturing
  await new Promise((resolve) => setTimeout(resolve, 60));

  try {
    const customBg = useAppStore.getState().visualData?.canvas?.bgColor;
    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = canvasBackground(node, customBg || (isDark ? '#0f172a' : '#f8fafc'));

    const isWebKit = /AppleWebKit/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const optimalPixelRatio = isWebKit ? Math.min(2, window.devicePixelRatio || 2) : 3;

    const toPngPromise = toPng(node, {
      quality: 1,
      pixelRatio: optimalPixelRatio,
      backgroundColor: bgColor,
      width: node.clientWidth,
      height: node.clientHeight,
      style: { transform: 'scale(1)', transformOrigin: 'top left' },
      filter: (domNode) => !shouldExcludeNode(domNode as HTMLElement),
      fontEmbedCSS: await captureFontCSS(node),
      skipFonts: false,
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('toPng timed out after 8000ms')), 8000);
    });
    let dataUrl: string;
    try { dataUrl = await Promise.race([toPngPromise, timeoutPromise]); }
    finally { clearTimeout(timer); }

    if (embedMetadata) {
      try {
        const storeState = useAppStore.getState();
        const projectPayload = {
          logicalData: storeState.logicalData,
          visualData: storeState.visualData,
        };
        dataUrl = injectPngDataUrlMetadata(dataUrl, projectPayload);
      } catch (err) {
        console.warn('Failed to embed project metadata in PNG export:', err);
      }
    }

    return dataUrl;
  } finally {
    restoreElements();
    if (originalLang === null) node.removeAttribute?.('lang'); else node.setAttribute?.('lang',originalLang);

  }
};

export const exportToPng = async (
  containerSelector: string,
  defaultName: string,
  language: 'tr' | 'en',
  framing: CaptureFraming = 'viewport'
): Promise<void> => {
  try {
    const dataUrl = await generatePngDataUrl(containerSelector, true, framing);

    if (isTauri()) {
      const selectedPath = await save({
        title: message(language, "exportMedia.saveAsPNG"),
        defaultPath: defaultName,
        filters: [{ name: 'PNG Image', extensions: ['png'] }],
      });

      if (!selectedPath) return;

      const base64Data = dataUrl.split(',')[1];
      const binaryString = window.atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      await writeFile(selectedPath, bytes);
    } else {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = defaultName;
      a.click();
    }
  } catch (err) {
    throw err;
  }
};

// ─────────────────────────────────────────────────────────────
// SVG Export (with Embedded Scene Data)
// ─────────────────────────────────────────────────────────────
const generateSvgDataUrlInternal = async (containerSelector: string, embedMetadata = true, framing: CaptureFraming = 'viewport'): Promise<string> => {
  const node = document.querySelector(containerSelector) as HTMLElement;
  if (!node) {
    throw new Error('Diagram container not found.');
  }


  await applyCaptureFraming(framing);
  const originalLang = node.getAttribute?.('lang') ?? null;
  node.setAttribute?.('lang',useAppStore.getState().language);
  const restoreElements = hideCaptureElements();


  await new Promise((resolve) => setTimeout(resolve, 60));

  try {
    const customBg = useAppStore.getState().visualData?.canvas?.bgColor;
    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = canvasBackground(node, customBg || (isDark ? '#0f172a' : '#f8fafc'));

    let svgDataUrl = await toSvg(node, {
      fontEmbedCSS: await captureFontCSS(node),
      backgroundColor: bgColor,
      width: node.clientWidth,
      height: node.clientHeight,
      filter: (domNode) => !shouldExcludeNode(domNode as HTMLElement),
    });

    if (embedMetadata) {
      try {
        const storeState = useAppStore.getState();
        const projectPayload = {
          logicalData: storeState.logicalData,
          visualData: storeState.visualData,
        };
        const svgContent = decodeURIComponent(svgDataUrl.replace(/^data:image\/svg\+xml;charset=utf-8,/, ''));
        const enrichedSvg = injectSvgMetadata(svgContent, projectPayload);
        svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(enrichedSvg)}`;
      } catch (err) {
        console.warn('Failed to embed project metadata in SVG export:', err);
      }
    }

    return svgDataUrl;
  } finally {
    restoreElements();
    if (originalLang === null) node.removeAttribute?.('lang'); else node.setAttribute?.('lang',originalLang);

  }
};

export const exportToSvg = async (
  containerSelector: string,
  defaultName: string,
  language: 'tr' | 'en',
  framing: CaptureFraming = 'viewport'
): Promise<void> => {
  try {
    const dataUrl = await generateSvgDataUrl(containerSelector, true, framing);

    if (isTauri()) {
      const selectedPath = await save({
        title: message(language, "exportMedia.saveAsSVG"),
        defaultPath: defaultName.replace(/\.png$/, '.svg'),
        filters: [{ name: 'SVG Image', extensions: ['svg'] }],
      });

      if (!selectedPath) return;

      const svgContent = decodeURIComponent(dataUrl.replace(/^data:image\/svg\+xml;charset=utf-8,/, ''));
      const encoder = new TextEncoder();
      await writeFile(selectedPath, encoder.encode(svgContent));
    } else {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = defaultName.replace(/\.png$/, '.svg');
      a.click();
    }
  } catch (err) {
    throw err;
  }
};



// ─────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────

/** Fast pixel hash for frame deduplication (samples ~2000 pixels). */
const hashPixels = (data: Uint8ClampedArray): number => {
  let hash = 0;
  const step = Math.max(1, Math.floor(data.length / 2000));
  for (let i = 0; i < data.length; i += step) {
    hash = (Math.imul(hash, 31) + data[i]) | 0;
  }
  return hash;
};



// ─────────────────────────────────────────────────────────────
// Canvas-based Frame Capture (replaces html-to-image for GIF/Video)
//
// Renders each frame using the Canvas 2D renderer instead of cloning
// the DOM. Typically 50-100× faster than html-to-image per frame,
// with full shadow/glow/gradient support.
// ─────────────────────────────────────────────────────────────



// Async wrapper for captureFramesCanvas that yields to the UI every N frames
const captureFramesCanvasAsync = async (
  maxDuration: number,
  fps: number,
  outputWidth: number,
  outputHeight: number,
  skipStatic: boolean,
  onProgress: (pct: number) => void
): Promise<{ canvas: HTMLCanvasElement; delay: number }[]> => {
  const store = useAppStore.getState();
  const { logicalData, visualData, libraryComponents } = store;
  const isDark = document.documentElement.classList.contains('dark');
  const theme: 'light' | 'dark' = isDark ? 'dark' : 'light';
  const appTheme = (store as any).theme || theme;

  const schedules: Schedule[] = calculateSchedules(logicalData, visualData.timelines || {});
  const bounds = calculateViewportBounds(logicalData, visualData);
  const scaleX = outputWidth / bounds.width;
  const scaleY = outputHeight / bounds.height;
  const viewScale = Math.min(scaleX, scaleY);
  const offsetX = (outputWidth - bounds.width * viewScale) / 2 - bounds.minX * viewScale;
  const offsetY = (outputHeight - bounds.height * viewScale) / 2 - bounds.minY * viewScale;

  const stepMs = 1000 / fps;
  const totalFrames = Math.max(1, Math.ceil(maxDuration / stepMs));

  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = outputWidth;
  renderCanvas.height = outputHeight;
  const ctx = renderCanvas.getContext('2d')!;

  // Pre-load FreeForm SVG caches into HTMLImageElements
  const freeformImages = new Map<string, HTMLImageElement>();
  const freeformNodes = logicalData.nodes.filter(n => n.type === 'freeform');
  await Promise.all(freeformNodes.map(async (node) => {
    const vis = visualData.layoutNodes[node.id];
    const svgCache = vis?.freeformContent?.svgCache;
    if (!svgCache) return;
    try {
      const img = new Image();
      const blob = new Blob([svgCache], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => { resolve(); };
        img.onerror = () => { reject(new Error('SVG load failed')); };
        img.src = url;
      });
      freeformImages.set(node.id, img);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn(`[Export] Failed to load FreeForm SVG for node ${node.id}:`, e);
    }
  }));

  const results: { canvas: HTMLCanvasElement; delay: number }[] = [];
  let lastHash: number | null = null;

  for (let frame = 0; frame <= totalFrames; frame++) {
    const time = Math.min(frame * stepMs, maxDuration);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, outputWidth, outputHeight);

    // 1. Fill entire output canvas background first (eliminates black side bars)
    const customBg = visualData.canvas?.bgColor;
    const bgColor = customBg || (theme === 'dark' ? '#0b0f19' : '#f8fafc');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, outputWidth, outputHeight);

    // 2. Draw dot grid pattern across the entire background
    if (visualData.canvas?.gridVisible !== false) {
      ctx.fillStyle = theme === 'dark' ? '#334155' : '#cbd5e1';
      for (let x = 0; x < outputWidth; x += 16) {
        for (let y = 0; y < outputHeight; y += 16) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 3. Render diagram content centered with scale/translate
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(viewScale, viewScale);

    renderDiagramFrame(ctx, {
      logicalData,
      visualData,
      libraryComponents,
      schedules,
      currentTime: time,
      theme,
      appTheme,
      canvasWidth: bounds.width,
      canvasHeight: bounds.height,
      skipBackground: true, // Don't redraw background inside diagram bounds
      freeformImages,
    });

    ctx.restore();

    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = outputWidth;
    frameCanvas.height = outputHeight;
    const fCtx = frameCanvas.getContext('2d')!;
    fCtx.drawImage(renderCanvas, 0, 0);

    if (skipStatic) {
      const imageData = fCtx.getImageData(0, 0, outputWidth, outputHeight);
      const hash = hashPixels(imageData.data);

      if (lastHash !== null && hash === lastHash && results.length > 0) {
        results[results.length - 1].delay += stepMs;
      } else {
        results.push({ canvas: frameCanvas, delay: stepMs });
        lastHash = hash;
      }
    } else {
      results.push({ canvas: frameCanvas, delay: stepMs });
    }

    onProgress(Math.floor((frame / totalFrames) * 55));

    // Yield to UI every 10 frames
    if (frame % 10 === 0) await new Promise(r => setTimeout(r, 0));
  }

  return results;
};

// ─────────────────────────────────────────────────────────────
// GIF Export (Canvas 2D Renderer)
// ─────────────────────────────────────────────────────────────
export const exportToGif = async (
  containerSelector: string,
  maxDuration: number,
  defaultName: string,
  language: 'tr' | 'en',
  fps: number,
  /** 1-100 user-facing quality. Maps to colour palette depth (16-256 colors). */
  quality: number,
  /** 0.25 | 0.5 | 0.75 | 1.0 — output canvas scale relative to the element */
  scale: number,
  onProgress: (percent: number) => void
): Promise<void> => {
  const node = document.querySelector(containerSelector) as HTMLElement;
  if (!node) throw new Error('Diagram container not found.');

  const store = useAppStore.getState();
  const wasPlaying = store.isPlaying;
  const originalTime = simulationClock.getTime();
  if (wasPlaying) store.pausePlayback();

  try {
    // Map quality 1-100 → palette depth 16-256 colors
    const numColors = Math.round(16 + (quality / 100) * 240);

    // Output dimensions — scale relative to the container size
    const outputWidth  = Math.round(node.clientWidth  * scale / 2) * 2;
    const outputHeight = Math.round(node.clientHeight * scale / 2) * 2;

    // ── Phase 1: Capture frames with Canvas 2D renderer (0-55%) ──
    const frames = await captureFramesCanvasAsync(
      maxDuration, fps, outputWidth, outputHeight, false, onProgress
    );

    // ── Phase 2: Encode with gifenc (55-100%) ─────────────────
    // Build a rich global palette by sampling pixels across multiple keyframes
    // so colors from animated particles, badges, and active edges are included.
    const sampleIndices = [0, Math.floor(frames.length / 2), frames.length - 1];
    const combinedLength = outputWidth * outputHeight * 4;
    const sampledData = new Uint8ClampedArray(combinedLength * sampleIndices.length);

    let offset = 0;
    sampleIndices.forEach((idx) => {
      if (frames[idx]) {
        const ctx = frames[idx].canvas.getContext('2d')!;
        const imgd = ctx.getImageData(0, 0, outputWidth, outputHeight);
        sampledData.set(imgd.data, offset);
        offset += imgd.data.length;
      }
    });

    const globalPalette = quantize(sampledData, numColors);
    const encoder = GIFEncoder();

    for (let i = 0; i < frames.length; i++) {
      const { canvas, delay } = frames[i];
      const ctx  = canvas.getContext('2d')!;
      const imgd = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const index = applyPalette(imgd.data, globalPalette);

      encoder.writeFrame(index, canvas.width, canvas.height, {
        palette: globalPalette,
        delay: Math.max(2, Math.round(delay / 10)), // GIF delay unit = 1/100 s
        repeat: i === 0 ? 0 : undefined,            // 0 = loop forever (only written once)
        dispose: 1,
      });

      onProgress(55 + Math.floor(((i + 1) / frames.length) * 45));
      if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0));
    }

    encoder.finish();
    const blob = new Blob([encoder.bytesView()], { type: 'image/gif' });

    // ── Phase 3: Save ─────────────────────────────────────────
    if (isTauri()) {
      const selectedPath = await save({
        title: message(language, "exportMedia.saveAsGIF"),
        defaultPath: defaultName,
        filters: [{ name: 'GIF Image', extensions: ['gif'] }],
      });
      if (selectedPath) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        await writeFile(selectedPath, bytes);
      }
    } else {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = defaultName;
      a.click();
      URL.revokeObjectURL(url);
    }
  } finally {
    store.setCurrentTime(originalTime);
    if (wasPlaying) store.resumePlayback();
  }
};


const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Capture the real canvas once per visual state, then stream frames through the encoder. */
export const exportToVideoScreenCapture = async (
  containerSelector: string, maxDuration: number, defaultName: string, language: 'tr' | 'en',
  fps: number, quality: 'low' | 'medium' | 'high', onProgress: (percent: number) => void, scale = 1, framing: CaptureFraming = 'viewport'
): Promise<void> => {
  const { captureCanvasScene } = await import('./captureScene');
  const { encodeSceneVideo } = await import('./streamSceneVideo');
  let lastProgress = 0;
  const progress = (value: number) => { lastProgress = Math.max(lastProgress, value); onProgress(lastProgress); };
  const scene = await captureCanvasScene(containerSelector,maxDuration,fps,value=>progress(Math.round(value*0.65)),true,framing);
  let result;
  try { result = await encodeSceneVideo(scene,quality,scale,value=>progress(65+Math.round(value*0.35))); }
  catch { throw new Error(message(language, 'exportMedia.encodeFailed')); }
  const ext = result.format, saveName = defaultName.replace(/\.(webm|mp4)$/i,`.${ext}`);
  if (isTauri()) {
    const path = await save({title:message(language,'exportMedia.saveAsVideo'),defaultPath:saveName,filters:[{name:ext==='mp4'?'MP4 Video':'WebM Video',extensions:[ext]}]});
    if (path) await writeFile(path,new Uint8Array(await result.blob.arrayBuffer()));
  } else triggerDownload(result.blob,saveName);
};


async function withStillCaptureInternal<T>(capture: () => Promise<T>): Promise<T> {
  const store = useAppStore.getState();
  const wasPlaying = store.isPlaying;
  const documentOwner = store.logicalData;
  const time = simulationClock.getTime();
  if (wasPlaying) store.pausePlayback();
  try { const run = () => withFullSequenceRendering(async () => { await prepareDocumentIcons(); return capture(); }); return await (wasPlaying ? withAnimatedCapture(run) : run()); }
  finally { if (useAppStore.getState().logicalData === documentOwner) { store.setCurrentTime(time); if (wasPlaying) store.resumePlayback(); } }
}

const withStillCapture = <T,>(capture: () => Promise<T>) => withCaptureLock(() => withStillCaptureInternal(capture));

export const generatePngDataUrl = (...args: Parameters<typeof generatePngDataUrlInternal>) => withStillCapture(() => generatePngDataUrlInternal(...args));

export const generateSvgDataUrl = (...args: Parameters<typeof generateSvgDataUrlInternal>) => withStillCapture(() => generateSvgDataUrlInternal(...args));

/** Retain the public entry point while sharing the faithful, bounded-memory pipeline. */
export const exportToVideo = exportToVideoScreenCapture;
