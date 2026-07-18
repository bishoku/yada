import { toPng, toCanvas } from 'html-to-image';
// @ts-ignore — gifenc ships ESM-only; types are inferred at runtime
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { useAppStore } from '../store/useAppStore';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { isTauri } from '../services/storage';

// ─────────────────────────────────────────────────────────────
// PNG Export (unchanged)
// ─────────────────────────────────────────────────────────────
export const exportToPng = async (
  containerSelector: string,
  defaultName: string,
  language: 'tr' | 'en'
): Promise<void> => {
  const node = document.querySelector(containerSelector) as HTMLElement;
  if (!node) {
    throw new Error('Diagram container not found.');
  }

  try {
    // Hide zoom controls and steps panel temporarily
    const elementsToHide = document.querySelectorAll('.react-flow__controls, .react-flow__panel, .react-flow__minimap');
    elementsToHide.forEach((el) => ((el as HTMLElement).style.display = 'none'));

    const customBg = useAppStore.getState().visualData?.canvas?.bgColor;
    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = customBg || (isDark ? '#0f172a' : '#f8fafc');

    const dataUrl = await toPng(node, {
      quality: 1,
      pixelRatio: 2, // High resolution
      backgroundColor: bgColor,
    });

    // Restore hidden elements
    elementsToHide.forEach((el) => ((el as HTMLElement).style.display = ''));

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
  } catch (error) {
    throw error;
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

/**
 * Capture the diagram node at each simulation time step.
 * Returns an array of { canvas, delay } where delay accounts for
 * any skipped static frames when skipStatic is true.
 */
const captureFrames = async (
  node: HTMLElement,
  maxDuration: number,
  fps: number,
  scale: number,
  skipStatic: boolean,
  bgColor: string,
  onProgress: (pct: number) => void
): Promise<{ canvas: HTMLCanvasElement; delay: number }[]> => {
  const store = useAppStore.getState();
  const stepMs = 1000 / fps;
  const totalFrames = Math.max(1, Math.ceil(maxDuration / stepMs));

  const scaledWidth  = Math.round(node.clientWidth  * scale);
  const scaledHeight = Math.round(node.clientHeight * scale);

  const elementsToHide = document.querySelectorAll(
    '.react-flow__controls, .react-flow__panel, .react-flow__minimap'
  );
  elementsToHide.forEach((el) => ((el as HTMLElement).style.display = 'none'));

  const waitRender = () =>
    new Promise<void>((resolve) =>
      requestAnimationFrame(() => { requestAnimationFrame(() => resolve()); })
    );

  const results: { canvas: HTMLCanvasElement; delay: number }[] = [];
  let lastHash: number | null = null;

  for (let frame = 0; frame <= totalFrames; frame++) {
    const time = Math.min(frame * stepMs, maxDuration);
    store.setCurrentTime(time);
    await waitRender();
    await new Promise((r) => setTimeout(r, 10)); // let react-flow finish

    // Capture at full resolution, then scale down via drawImage for best quality
    const raw = await toCanvas(node, {
      pixelRatio: 1,
      skipFonts: true,
      backgroundColor: bgColor,
      width: node.clientWidth,
      height: node.clientHeight,
      style: { transform: 'scale(1)', transformOrigin: 'top left' },
    });

    // Scale-down step (no-op when scale === 1)
    let target = raw;
    if (scale < 1) {
      target = document.createElement('canvas');
      target.width  = scaledWidth;
      target.height = scaledHeight;
      const ctx = target.getContext('2d')!;
      ctx.drawImage(raw, 0, 0, scaledWidth, scaledHeight);
    }

    if (skipStatic) {
      const ctx = target.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, target.width, target.height);
      const hash = hashPixels(imageData.data);

      if (lastHash !== null && hash === lastHash && results.length > 0) {
        // Identical frame — extend the last frame's delay instead
        results[results.length - 1].delay += stepMs;
      } else {
        results.push({ canvas: target, delay: stepMs });
        lastHash = hash;
      }
    } else {
      results.push({ canvas: target, delay: stepMs });
    }

    onProgress(Math.floor((frame / totalFrames) * 55));
  }

  elementsToHide.forEach((el) => ((el as HTMLElement).style.display = ''));
  return results;
};

// ─────────────────────────────────────────────────────────────
// GIF Export
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
  /** When true, consecutive identical frames are merged (extends previous frame delay). */
  skipStatic: boolean,
  onProgress: (percent: number) => void
): Promise<void> => {
  const node = document.querySelector(containerSelector) as HTMLElement;
  if (!node) throw new Error('Diagram container not found.');

  const store = useAppStore.getState();
  const wasPlaying = store.isPlaying;
  const originalTime = store.currentTime;
  if (wasPlaying) store.pausePlayback();

  try {
    const customBg = useAppStore.getState().visualData?.canvas?.bgColor;
    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = customBg || (isDark ? '#0f172a' : '#f8fafc');

    // Map quality 1-100 → palette depth 16-256 colors
    const numColors = Math.round(16 + (quality / 100) * 240);

    // ── Phase 1: Capture frames (0-55%) ──────────────────────
    const frames = await captureFrames(
      node,
      maxDuration,
      fps,
      scale,
      skipStatic,
      bgColor,
      onProgress
    );

    // ── Phase 2: Encode with gifenc (55-100%) ─────────────────
    const encoder = GIFEncoder();

    for (let i = 0; i < frames.length; i++) {
      const { canvas, delay } = frames[i];
      const ctx  = canvas.getContext('2d')!;
      const imgd = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const palette = quantize(imgd.data, numColors);
      const index   = applyPalette(imgd.data, palette);

      encoder.writeFrame(index, canvas.width, canvas.height, {
        palette,
        delay: Math.max(2, Math.round(delay / 10)), // GIF delay unit = 1/100 s
        repeat: i === 0 ? 0 : undefined,            // 0 = loop forever (only written once)
        dispose: 1,
      });

      onProgress(55 + Math.floor(((i + 1) / frames.length) * 45));
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
// Video (WebM) Export — uses MediaRecorder API
// ─────────────────────────────────────────────────────────────
export const exportToVideo = async (
  containerSelector: string,
  maxDuration: number,
  defaultName: string,
  language: 'tr' | 'en',
  fps: number,
  /** 'low' ≈ 1 Mbps | 'medium' ≈ 3 Mbps | 'high' ≈ 8 Mbps */
  quality: 'low' | 'medium' | 'high',
  onProgress: (percent: number) => void
): Promise<void> => {
  const node = document.querySelector(containerSelector) as HTMLElement;
  if (!node) throw new Error('Diagram container not found.');

  if (typeof MediaRecorder === 'undefined') {
    throw new Error(
      language === 'tr'
        ? 'Bu tarayıcı video kaydını desteklemiyor.'
        : 'This browser does not support video recording.'
    );
  }

  const store = useAppStore.getState();
  const wasPlaying = store.isPlaying;
  const originalTime = store.currentTime;
  if (wasPlaying) store.pausePlayback();

  try {
    const customBg = useAppStore.getState().visualData?.canvas?.bgColor;
    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = customBg || (isDark ? '#0f172a' : '#f8fafc');

    const bitrates: Record<string, number> = {
      low:    1_000_000,
      medium: 3_000_000,
      high:   8_000_000,
    };

    // Pick best supported codec
    const mimeType = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ].find((t) => MediaRecorder.isTypeSupported(t)) ?? 'video/webm';

    // ── Phase 1: Capture all frames (0-55%) ──────────────────
    const frames = await captureFrames(
      node,
      maxDuration,
      fps,
      1, // always full resolution for video
      false, // no frame dedup for video — keeps smooth motion
      bgColor,
      onProgress
    );

    // ── Phase 2: Feed frames into MediaRecorder (55-100%) ─────
    const { width, height } = frames[0].canvas;

    const recordCanvas = document.createElement('canvas');
    recordCanvas.width  = width;
    recordCanvas.height = height;
    const rCtx = recordCanvas.getContext('2d')!;

    // captureStream(0) = manual frame push via requestFrame()
    const stream = (recordCanvas as any).captureStream(0) as MediaStream;
    const videoTrack = stream.getVideoTracks()[0] as any;

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: bitrates[quality],
    });
    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.start();

    for (let i = 0; i < frames.length; i++) {
      rCtx.drawImage(frames[i].canvas, 0, 0);
      // Push the current canvas frame to the MediaStream
      if (typeof videoTrack.requestFrame === 'function') {
        videoTrack.requestFrame();
      }
      // Wait the frame's delay so the video has correct timing
      await new Promise((r) => setTimeout(r, frames[i].delay));
      onProgress(55 + Math.floor(((i + 1) / frames.length) * 45));
    }

    return new Promise<void>((resolve, reject) => {
      recorder.onstop = async () => {
        try {
          const ext  = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const blob = new Blob(chunks, { type: mimeType });
          const fileName = defaultName; // already has .webm extension

          if (isTauri()) {
            const selectedPath = await save({
              title: language === 'tr' ? 'Video Olarak Kaydet' : 'Save as Video',
              defaultPath: fileName,
              filters: [{ name: 'WebM Video', extensions: [ext] }],
            });
            if (selectedPath) {
              const bytes = new Uint8Array(await blob.arrayBuffer());
              await writeFile(selectedPath, bytes);
            }
          } else {
            const url = URL.createObjectURL(blob);
            const a   = document.createElement('a');
            a.href     = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
          }
          resolve();
        } catch (err) {
          reject(err);
        } finally {
          store.setCurrentTime(originalTime);
          if (wasPlaying) store.startPlayback();
        }
      };
      recorder.stop();
    });

  } catch (error) {
    store.setCurrentTime(originalTime);
    if (wasPlaying) store.startPlayback();
    throw error;
  }
};
