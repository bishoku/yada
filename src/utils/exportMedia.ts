import { toPng } from 'html-to-image';
// @ts-ignore — gifenc ships ESM-only; types are inferred at runtime
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmArrayBufferTarget } from 'webm-muxer';
import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4ArrayBufferTarget } from 'mp4-muxer';
import { useAppStore } from '../store/useAppStore';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { isTauri } from '../services/storage';
import {
  renderDiagramFrame,
  calculateSchedules,
  calculateViewportBounds,
  type Schedule,
} from './canvasRenderer';

// ─────────────────────────────────────────────────────────────
const EXCLUDE_SELECTOR = '.react-flow__controls, .react-flow__panel, .react-flow__minimap, .react-flow__attribution, .export-exclude, .react-flow__handle, .react-flow__resize-control';

const shouldExcludeNode = (domNode: HTMLElement): boolean => {
  if (!domNode || !domNode.classList) return false;
  return (
    domNode.classList.contains('react-flow__controls') ||
    domNode.classList.contains('react-flow__panel') ||
    domNode.classList.contains('react-flow__minimap') ||
    domNode.classList.contains('react-flow__attribution') ||
    domNode.classList.contains('export-exclude') ||
    domNode.classList.contains('react-flow__handle') ||
    domNode.classList.contains('react-flow__resize-control')
  );
};

const hideUIElements = () => {
  const elements = document.querySelectorAll(EXCLUDE_SELECTOR);
  elements.forEach((el) => {
    (el as HTMLElement).style.setProperty('display', 'none', 'important');
  });
  return elements;
};

const restoreUIElements = (elements: NodeListOf<Element>) => {
  elements.forEach((el) => {
    (el as HTMLElement).style.removeProperty('display');
  });
};

/**
 * Injects a global stylesheet that sets box-shadow: none on every element.
 *
 * WHY: html-to-image clones the DOM, then copies getComputedStyle() from each
 * original element to the clone as inline styles. If we manipulate individual
 * element.style properties on the original, html-to-image's copyComputedStyle
 * step can overwrite them with the Tailwind class values. Injecting a <style>
 * at highest specificity (* { box-shadow: none !important }) ensures that
 * getComputedStyle() already returns 'none' when html-to-image reads it,
 * so the clone also gets 'none' written as its inline style.
 */
const suppressShadows = (): HTMLStyleElement => {
  const style = document.createElement('style');
  style.dataset.exportNoshadow = '1';
  style.textContent = `
    *, *::before, *::after {
      box-shadow: none !important;
      -webkit-box-shadow: none !important;
      filter: none !important;
      -webkit-filter: none !important;
      --tw-ring-offset-shadow: 0 0 #0000 !important;
      --tw-ring-shadow: 0 0 #0000 !important;
      --tw-shadow: 0 0 #0000 !important;
      --tw-shadow-colored: 0 0 #0000 !important;
    }
  `;
  document.head.appendChild(style);
  return style;
};

const restoreShadows = (el: HTMLStyleElement): void => {
  el.remove();
};

// ─────────────────────────────────────────────────────────────
// PNG Export
// ─────────────────────────────────────────────────────────────
export const generatePngDataUrl = async (containerSelector: string): Promise<string> => {
  const node = document.querySelector(containerSelector) as HTMLElement;
  if (!node) {
    throw new Error('Diagram container not found.');
  }

  // Trigger fitView to center & frame all nodes before capturing the PNG image
  window.dispatchEvent(new CustomEvent('export:fitview'));
  await new Promise((resolve) => setTimeout(resolve, 100));

  const elementsToHide = hideUIElements();
  const shadowStyle = suppressShadows();

  // Wait for the browser to apply the injected stylesheet to the DOM before capturing
  await new Promise((resolve) => setTimeout(resolve, 60));

  try {
    const customBg = useAppStore.getState().visualData?.canvas?.bgColor;
    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = customBg || (isDark ? '#0f172a' : '#f8fafc');

    // WebKit (Safari / Tauri WKWebView on macOS) multiplies SVG foreignObject shadow offsets
    // when pixelRatio > 2. Detect WebKit and use optimal devicePixelRatio.
    const isWebKit = /AppleWebKit/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const optimalPixelRatio = isWebKit ? Math.min(2, window.devicePixelRatio || 2) : 3;

    const dataUrl = await toPng(node, {
      quality: 1,
      pixelRatio: optimalPixelRatio,
      backgroundColor: bgColor,
      width: node.clientWidth,
      height: node.clientHeight,
      style: { transform: 'scale(1)', transformOrigin: 'top left' },
      filter: (domNode) => !shouldExcludeNode(domNode as HTMLElement),
    });
    
    return dataUrl;
  } finally {
    restoreUIElements(elementsToHide);
    restoreShadows(shadowStyle);
  }
};

export const exportToPng = async (
  containerSelector: string,
  defaultName: string,
  language: 'tr' | 'en'
): Promise<void> => {
  try {
    const dataUrl = await generatePngDataUrl(containerSelector);

    if (isTauri()) {
      const selectedPath = await save({
        title: language === 'tr' ? 'PNG Olarak Kaydet' : 'Save as PNG',
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
    console.error('Export PNG error:', err);
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
  const originalTime = store.currentTime;
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
        title: language === 'tr' ? 'GIF Olarak Kaydet' : 'Save as GIF',
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
    if (wasPlaying) store.startPlayback();
  }
};


// ─────────────────────────────────────────────────────────────
// Video (WebM) Export
//
// Fast path  → WebCodecs API + webm-muxer
//   Encodes frames with explicit timestamps, no real-time wait.
//   Hardware-accelerated on supported GPUs. Typically 20-50× faster
//   than the animation duration (vs. MediaRecorder which takes ≥ duration).
//
// Fallback   → MediaRecorder API
//   Used when VideoEncoder is unavailable (older browsers).
// ─────────────────────────────────────────────────────────────

/** True when the browser / Tauri WebView supports the WebCodecs API. */
const supportsWebCodecs = (): boolean =>
  typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';

const BITRATES: Record<string, number> = {
  low:    1_000_000,
  medium: 3_000_000,
  high:   8_000_000,
};

/**
 * Fast encoding path via WebCodecs + webm-muxer.
 * Frames are submitted with explicit timestamps — no setTimeout waiting.
 * Returns the finished WebM blob.
 */
const encodeWithWebCodecs = async (
  frames: { canvas: HTMLCanvasElement; delay: number }[],
  width: number,
  height: number,
  fps: number,
  quality: 'low' | 'medium' | 'high',
  onProgress: (pct: number) => void,
  scale: number = 1
): Promise<Blob> => {
  // Probe codec support: prefer VP9 (better compression), fall back to VP8
  type CodecPair = { enc: string; mux: 'V_VP9' | 'V_VP8' };
  const candidates: CodecPair[] = [
    { enc: 'vp09.00.41.08', mux: 'V_VP9' }, // VP9 profile 0, level 4.1
    { enc: 'vp8',           mux: 'V_VP8' },
  ];

  let codec: CodecPair | undefined;
  for (const c of candidates) {
    const effectiveBitrate = scale > 1 ? Math.round(BITRATES[quality] * scale) : BITRATES[quality];
    const probe = await VideoEncoder.isConfigSupported({
      codec: c.enc, width, height,
      bitrate: effectiveBitrate,
      framerate: fps,
    });
    if (probe.supported) { codec = c; break; }
  }
  if (!codec) throw new Error('No supported WebCodecs video codec found.');

  const target  = new WebmArrayBufferTarget();
  const muxer   = new WebmMuxer({
    target,
    video: { codec: codec.mux, width, height, frameRate: fps },
    firstTimestampBehavior: 'strict',
  });

  return new Promise<Blob>((resolve, reject) => {
    const encoder = new VideoEncoder({
      output: (chunk, meta) => {
        try { muxer.addVideoChunk(chunk, meta); }
        catch (e) { reject(e); }
      },
      error: reject,
    });

    const effectiveBitrate = scale > 1 ? Math.round(BITRATES[quality] * scale) : BITRATES[quality];
    encoder.configure({
      codec:                 codec!.enc,
      width,
      height,
      bitrate:               effectiveBitrate,
      framerate:             fps,
      hardwareAcceleration:  'prefer-hardware',
      latencyMode:           'quality',
    });

    (async () => {
      try {
        let timestampUs   = 0;
        const keyInterval = Math.max(1, fps * 2); // keyframe every 2 s

        for (let i = 0; i < frames.length; i++) {
          const { canvas, delay } = frames[i];
          const durationUs = Math.round(delay * 1000); // ms → µs

          const vf = new VideoFrame(canvas, { timestamp: timestampUs, duration: durationUs });
          encoder.encode(vf, { keyFrame: i % keyInterval === 0 });
          vf.close();

          timestampUs += durationUs;
          onProgress(55 + Math.floor(((i + 1) / frames.length) * 45));

          // Yield every 10 frames so the UI stays responsive
          if (i % 10 === 0) await new Promise(r => setTimeout(r, 0));
        }

        await encoder.flush();
        muxer.finalize();
        resolve(new Blob([target.buffer], { type: 'video/webm' }));
      } catch (e) {
        reject(e);
      }
    })();
  });
};

/**
 * Primary encoding path: WebCodecs H.264 + mp4-muxer → MP4.
 * Works in both Tauri (WKWebView) and browsers (Chrome/Edge/Safari).
 * Hardware-accelerated — no IPC per frame, encoding stays in the WebView.
 */
const encodeWithWebCodecsMp4 = async (
  frames: { canvas: HTMLCanvasElement; delay: number }[],
  width: number,
  height: number,
  fps: number,
  quality: 'low' | 'medium' | 'high',
  onProgress: (pct: number) => void,
  scale: number = 1
): Promise<Blob> => {
  // Ensure even dimensions (H.264 requirement)
  const encWidth  = width  % 2 === 0 ? width  : width  + 1;
  const encHeight = height % 2 === 0 ? height : height + 1;

  const effectiveBitrate = scale > 1 ? Math.round(BITRATES[quality] * scale) : BITRATES[quality];

  // Dynamically build H.264 profile candidates based on frame resolution.
  // Standard 1080p uses Level 4.0/3.1 (avc1.42e028 / avc1.42e01f).
  // High-DPI / 2K / 4K (scale 1.5× / 2.0×) requires Level 5.1/4.1 (avc1.640033 / avc1.4d0033).
  const totalPixels = encWidth * encHeight;
  const isHighRes = encWidth > 2048 || encHeight > 2048 || totalPixels > 2_073_600;

  const h264Candidates = isHighRes
    ? [
        'avc1.640033', // High Profile Level 5.1 (4K support up to 4096x2304 @ 60fps)
        'avc1.4d0033', // Main Profile Level 5.1
        'avc1.42e033', // Constrained Baseline Level 5.1
        'avc1.640029', // High Profile Level 4.1 (2K @ 60fps)
        'avc1.4d0029', // Main Profile Level 4.1
        'avc1.42e029', // Constrained Baseline Level 4.1
        'avc1.640028', // High Profile Level 4.0 (1080p @ 60fps)
        'avc1.4d0028', // Main Profile Level 4.0
        'avc1.42e028', // Constrained Baseline Level 4.0
        'avc1.42e01f', // Constrained Baseline Level 3.1
      ]
    : [
        'avc1.42e028', // Constrained Baseline Level 4.0 (1080p @ 60fps)
        'avc1.42e01f', // Constrained Baseline Level 3.1 (Safari/WKWebView standard)
        'avc1.42001f', // Baseline Level 3.1 (Chrome/Edge standard)
        'avc1.4d0028', // Main Profile Level 4.0
        'avc1.640028', // High Profile Level 4.0
        'avc1.42001e', // Baseline Level 3.0
      ];

  let codecStr: string | undefined;
  for (const c of h264Candidates) {
    try {
      const probe = await VideoEncoder.isConfigSupported({
        codec: c, width: encWidth, height: encHeight,
        bitrate: effectiveBitrate,
        framerate: fps,
        hardwareAcceleration: 'no-preference',
      });
      if (probe.supported) { codecStr = c; break; }
    } catch { /* WebView strict probe fallback */ }
  }
  // Default to appropriate resolution profile if probing was ambiguous
  if (!codecStr) {
    codecStr = isHighRes ? 'avc1.640033' : 'avc1.42e028';
  }

  const target = new Mp4ArrayBufferTarget();
  const muxer = new Mp4Muxer({
    target,
    video: { codec: 'avc', width: encWidth, height: encHeight },
    firstTimestampBehavior: 'strict',
    fastStart: 'in-memory',
  });

  // If source frames have odd dimensions, we'll pad them
  const needsPadding = encWidth !== width || encHeight !== height;
  let padCanvas: HTMLCanvasElement | null = null;
  let padCtx: CanvasRenderingContext2D | null = null;
  if (needsPadding) {
    padCanvas = document.createElement('canvas');
    padCanvas.width  = encWidth;
    padCanvas.height = encHeight;
    padCtx = padCanvas.getContext('2d')!;
  }

  return new Promise<Blob>((resolve, reject) => {
    const encoder = new VideoEncoder({
      output: (chunk, meta) => {
        try { muxer.addVideoChunk(chunk, meta); }
        catch (e) { reject(e); }
      },
      error: (e) => reject(new Error(`H.264 encode error: ${e.message}`)),
    });

    encoder.configure({
      codec:   codecStr!,
      width:   encWidth,
      height:  encHeight,
      bitrate: effectiveBitrate,
      framerate: fps,
      // 'no-preference' lets the platform choose hardware or software encoding.
      // 'prefer-hardware' causes 'Encoding task failed' on WKWebView/macOS
      // when the hardware encoder cannot handle the RGBA→YUV conversion.
      hardwareAcceleration: 'no-preference',
      // Do not set latencyMode — default ('realtime') is more widely supported
      // than 'quality', which is unimplemented in some WebView versions.
    });

    (async () => {
      try {
        let timestampUs   = 0;
        const keyInterval = Math.max(1, fps * 2);

        for (let i = 0; i < frames.length; i++) {
          const { canvas, delay } = frames[i];
          const durationUs = Math.round(delay * 1000);

          // Pad to even dimensions if needed
          const src = needsPadding ? (() => {
            padCtx!.clearRect(0, 0, encWidth, encHeight);
            padCtx!.drawImage(canvas, 0, 0);
            return padCanvas!;
          })() : canvas;

          const vf = new VideoFrame(src, { timestamp: timestampUs, duration: durationUs });
          encoder.encode(vf, { keyFrame: i % keyInterval === 0 });
          vf.close();

          timestampUs += durationUs;
          onProgress(55 + Math.floor(((i + 1) / frames.length) * 45));

          if (i % 10 === 0) await new Promise(r => setTimeout(r, 0));
        }

        await encoder.flush();
        muxer.finalize();
        resolve(new Blob([target.buffer], { type: 'video/mp4' }));
      } catch (e) {
        reject(e);
      }
    })();
  });
};

/** Simple browser download helper */
const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Fallback encoding path via MediaRecorder.
 * Must wait in real-time between frames so MediaRecorder gets correct timing.
 */
const encodeWithMediaRecorder = (
  frames: { canvas: HTMLCanvasElement; delay: number }[],
  width: number,
  height: number,
  quality: 'low' | 'medium' | 'high',
  onProgress: (pct: number) => void,
  scale: number = 1
): Promise<Blob> => {
  const mimeType = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ].find(t => MediaRecorder.isTypeSupported(t)) ?? 'video/webm';

  const recordCanvas = document.createElement('canvas');
  recordCanvas.width  = width;
  recordCanvas.height = height;
  const rCtx = recordCanvas.getContext('2d')!;

  const stream     = (recordCanvas as any).captureStream(0) as MediaStream;
  const videoTrack = stream.getVideoTracks()[0] as any;
  const chunks: Blob[] = [];

  const effectiveBitrate = scale > 1 ? Math.round(BITRATES[quality] * scale) : BITRATES[quality];
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: effectiveBitrate,
  });
  recorder.ondataavailable = (e: BlobEvent) => {
    if (e.data?.size > 0) chunks.push(e.data);
  };

  return new Promise<Blob>(async (resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = reject;
    recorder.start();

    for (let i = 0; i < frames.length; i++) {
      rCtx.drawImage(frames[i].canvas, 0, 0);
      if (typeof videoTrack.requestFrame === 'function') videoTrack.requestFrame();
      await new Promise(r => setTimeout(r, frames[i].delay)); // real-time wait
      onProgress(55 + Math.floor(((i + 1) / frames.length) * 45));
    }

    recorder.stop();
  });
};

export const exportToVideo = async (
  containerSelector: string,
  maxDuration: number,
  defaultName: string,
  language: 'tr' | 'en',
  fps: number,
  /** 'low' ≈ 1 Mbps | 'medium' ≈ 3 Mbps | 'high' ≈ 8 Mbps (at 1× scale) */
  quality: 'low' | 'medium' | 'high',
  onProgress: (percent: number) => void,
  /**
   * Output resolution multiplier relative to CSS element size.
   * 1 = same dimensions as on screen (supersampled for sharpness).
   * 1.5–2 = higher-res output for even crisper text at larger file size.
   */
  scale: number = 1
): Promise<void> => {
  const node = document.querySelector(containerSelector) as HTMLElement;
  if (!node) throw new Error('Diagram container not found.');

  // Browser-only validation
  if (!isTauri() && !supportsWebCodecs() && typeof MediaRecorder === 'undefined') {
    throw new Error(
      language === 'tr'
        ? 'Bu tarayıcı video dışa aktarmayı desteklemiyor.'
        : 'This browser does not support video export.'
    );
  }

  const store = useAppStore.getState();
  const wasPlaying  = store.isPlaying;
  const originalTime = store.currentTime;
  if (wasPlaying) store.pausePlayback();

  try {
    // Output dimensions with even numbers (H.264 requirement)
    const outputWidth  = Math.round(node.clientWidth  * scale / 2) * 2;
    const outputHeight = Math.round(node.clientHeight * scale / 2) * 2;

    // ── Phase 1: Capture frames with Canvas 2D renderer (0-55%) ──
    const frames = await captureFramesCanvasAsync(
      maxDuration, fps, outputWidth, outputHeight,
      false, // no frame dedup for smooth video
      onProgress
    );

    const { width, height } = frames[0].canvas;

    // ── Phase 2: Encode (55-100%) ─────────────────────────────
    let blob: Blob;
    let format: 'mp4' | 'webm' = 'mp4';

    if (supportsWebCodecs()) {
      try {
        blob = await encodeWithWebCodecsMp4(frames, width, height, fps, quality, onProgress, scale);
        format = 'mp4';
      } catch (mp4Err) {
        console.warn('[Video Export] H.264/MP4 encoding failed, falling back to WebM:', mp4Err);
        format = 'webm';
        try {
          blob = await encodeWithWebCodecs(frames, width, height, fps, quality, onProgress, scale);
        } catch (webmErr) {
          console.warn('[Video Export] VP9/WebM encoding failed, falling back to MediaRecorder:', webmErr);
          blob = await encodeWithMediaRecorder(frames, width, height, quality, onProgress, scale);
        }
      }
    } else {
      console.warn('[Video Export] WebCodecs API not available — using MediaRecorder.');
      format = 'webm';
      blob = await encodeWithMediaRecorder(frames, width, height, quality, onProgress, scale);
    }

    // ── Phase 3: Save ─────────────────────────────────────────
    const ext = format === 'mp4' ? 'mp4' : 'webm';
    const filterName = format === 'mp4' ? 'MP4 Video' : 'WebM Video';
    const saveName = defaultName.replace(/\.(webm|mp4)$/i, `.${ext}`);

    if (isTauri()) {
      const selectedPath = await save({
        title:   language === 'tr' ? 'Video Olarak Kaydet' : 'Save as Video',
        defaultPath: saveName,
        filters: [{ name: filterName, extensions: [ext] }],
      });
      if (selectedPath) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        await writeFile(selectedPath, bytes);
      }
    } else {
      triggerDownload(blob, saveName);
    }
  } finally {
    store.setCurrentTime(originalTime);
    if (wasPlaying) store.startPlayback();
  }
};

// ─────────────────────────────────────────────────────────────
// Video Screen Capture Mode (Option C)
//
// Records the actual DOM viewport in real-time by playing the
// simulation at 1× speed and capturing the canvas stream.
// Perfect visual fidelity — what you see is what you get.
// ─────────────────────────────────────────────────────────────
export const exportToVideoScreenCapture = async (
  containerSelector: string,
  maxDuration: number,
  defaultName: string,
  language: 'tr' | 'en',
  fps: number,
  quality: 'low' | 'medium' | 'high',
  onProgress: (percent: number) => void
): Promise<void> => {
  const node = document.querySelector(containerSelector) as HTMLElement;
  if (!node) throw new Error('Diagram container not found.');

  const store = useAppStore.getState();
  const wasPlaying = store.isPlaying;
  const originalTime = store.currentTime;
  if (wasPlaying) store.pausePlayback();

  // Temporarily hide UI controls during capture
  const elementsToHide = hideUIElements();
  // Inject a global stylesheet to suppress box-shadow during capture.
  const shadowStyle = suppressShadows();

  try {
    const width  = Math.round(node.clientWidth / 2) * 2;
    const height = Math.round(node.clientHeight / 2) * 2;

    const { toCanvas, getFontEmbedCSS } = await import('html-to-image');
    const fontEmbedCSS = await getFontEmbedCSS(node).catch(() => '');

    const customBg = store.visualData?.canvas?.bgColor;
    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = customBg || (isDark ? '#0f172a' : '#f8fafc');

    const stepMs = 1000 / fps;
    const totalFrames = Math.max(1, Math.ceil(maxDuration / stepMs));
    const frames: { canvas: HTMLCanvasElement; delay: number }[] = [];

    // Phase 1: Capture frames (0-55%)
    for (let frame = 0; frame <= totalFrames; frame++) {
      const time = Math.min(frame * stepMs, maxDuration);
      store.setCurrentTime(time);

      // Wait for React Flow DOM to update its state & positions
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      // Capture actual HTML DOM snapshot exactly as rendered on screen
      const rawCanvas = await toCanvas(node, {
        pixelRatio: 1,
        fontEmbedCSS,
        backgroundColor: bgColor,
        width: node.clientWidth,
        height: node.clientHeight,
        style: { transform: 'scale(1)', transformOrigin: 'top left' },
        filter: (domNode) => !shouldExcludeNode(domNode as HTMLElement),
      });

      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = width;
      captureCanvas.height = height;
      const captureCtx = captureCanvas.getContext('2d')!;
      captureCtx.drawImage(rawCanvas, 0, 0, width, height);

      frames.push({ canvas: captureCanvas, delay: stepMs });

      onProgress(Math.floor((frame / totalFrames) * 55));
      // Yield so UI updates progress bar
      if (frame % 5 === 0) await new Promise((r) => setTimeout(r, 0));
    }

    // Phase 2: Encode (55-100%)
    let blob: Blob;
    let format: 'mp4' | 'webm' = 'mp4';
    const scale = 1;

    if (supportsWebCodecs()) {
      try {
        blob = await encodeWithWebCodecsMp4(frames, width, height, fps, quality, onProgress, scale);
        format = 'mp4';
      } catch (mp4Err) {
        console.warn('[Video Export Screen Capture] H.264/MP4 encoding failed, falling back to WebM:', mp4Err);
        format = 'webm';
        try {
          blob = await encodeWithWebCodecs(frames, width, height, fps, quality, onProgress, scale);
        } catch (webmErr) {
          console.warn('[Video Export Screen Capture] VP9/WebM encoding failed, falling back to MediaRecorder:', webmErr);
          blob = await encodeWithMediaRecorder(frames, width, height, quality, onProgress, scale);
        }
      }
    } else {
      console.warn('[Video Export Screen Capture] WebCodecs API not available — using MediaRecorder.');
      format = 'webm';
      blob = await encodeWithMediaRecorder(frames, width, height, quality, onProgress, scale);
    }

    // Phase 3: Save
    const ext = format === 'mp4' ? 'mp4' : 'webm';
    const filterName = format === 'mp4' ? 'MP4 Video' : 'WebM Video';
    const saveName = defaultName.replace(/\.(webm|mp4)$/i, `.${ext}`);

    if (isTauri()) {
      const selectedPath = await save({
        title: language === 'tr' ? 'Video Olarak Kaydet' : 'Save as Video',
        defaultPath: saveName,
        filters: [{ name: filterName, extensions: [ext] }],
      });
      if (selectedPath) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        await writeFile(selectedPath, bytes);
      }
    } else {
      triggerDownload(blob, saveName);
    }
  } finally {
    restoreShadows(shadowStyle);
    restoreUIElements(elementsToHide);
    store.setCurrentTime(originalTime);
    if (wasPlaying) store.startPlayback();
  }
};

