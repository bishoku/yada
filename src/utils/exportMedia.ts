import { toPng, toCanvas } from 'html-to-image';
import GIF from 'gif.js';
import workerUrl from 'gif.js/dist/gif.worker.js?url';
import { useAppStore } from '../store/useAppStore';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { isTauri } from '../services/storage';

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

    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = isDark ? '#0f172a' : '#f8fafc';

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

export const exportToGif = async (
  containerSelector: string,
  maxDuration: number,
  defaultName: string,
  language: 'tr' | 'en',
  fps: number,
  quality: number,
  onProgress: (percent: number) => void
): Promise<void> => {
  const node = document.querySelector(containerSelector) as HTMLElement;
  if (!node) {
    throw new Error('Diagram container not found.');
  }

  const store = useAppStore.getState();
  const wasPlaying = store.isPlaying;
  const originalTime = store.currentTime;

  if (wasPlaying) {
    store.pausePlayback();
  }

  try {
    const stepMs = 1000 / fps;
    const totalFrames = Math.max(1, Math.ceil(maxDuration / stepMs));
    
    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = isDark ? '#0f172a' : '#f8fafc';

    // Create GIF encoder
    const gif = new GIF({
      workers: 2,
      quality: quality, // Passed from user selection
      workerScript: workerUrl,
      background: bgColor, // Matches canvas background
      transparent: null,
      width: node.clientWidth, // Sınırları belirterek fazladan boşluk render edilmesini engelleriz
      height: node.clientHeight,
    });

    // We must wait for React to render after setting time
    const waitRender = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const elementsToHide = document.querySelectorAll('.react-flow__controls, .react-flow__panel, .react-flow__minimap');
    elementsToHide.forEach((el) => ((el as HTMLElement).style.display = 'none'));

    for (let frame = 0; frame <= totalFrames; frame++) {
      const time = Math.min(frame * stepMs, maxDuration);
      store.setCurrentTime(time);
      await waitRender();
      await new Promise(r => setTimeout(r, 10)); // Give react-flow a little more time

      const canvas = await toCanvas(node, {
        pixelRatio: 1, // 1x çözünürlük
        skipFonts: true, // Animasyon esnasında font indirmeyi atla (hızlandırır)
        backgroundColor: bgColor,
        width: node.clientWidth,
        height: node.clientHeight,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        }
      });

      gif.addFrame(canvas, { delay: stepMs, copy: true }); // copy: true canvas memory leak'i önler

      onProgress(Math.floor((frame / totalFrames) * 50)); // 0-50% for rendering frames
    }

    elementsToHide.forEach((el) => ((el as HTMLElement).style.display = ''));

    // Now render the GIF
    gif.on('progress', (p: number) => {
      onProgress(50 + Math.floor(p * 50)); // 50-100% for encoding
    });

    return new Promise((resolve, reject) => {
      gif.on('finished', async (blob: Blob) => {
        try {
          if (isTauri()) {
            const selectedPath = await save({
              title: language === 'tr' ? 'GIF Olarak Kaydet' : 'Save as GIF',
              defaultPath: defaultName,
              filters: [{ name: 'GIF Image', extensions: ['gif'] }],
            });

            if (selectedPath) {
                const buffer = await blob.arrayBuffer();
                const bytes = new Uint8Array(buffer);
                await writeFile(selectedPath, bytes);
            }
          } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = defaultName;
            a.click();
            URL.revokeObjectURL(url);
          }
          resolve();
        } catch (err) {
          reject(err);
        } finally {
          // Restore state
          store.setCurrentTime(originalTime);
          if (wasPlaying) store.startPlayback();
        }
      });

      gif.render();
    });

  } catch (error) {
    // Restore state on error
    store.setCurrentTime(originalTime);
    if (wasPlaying) store.startPlayback();
    throw error;
  }
};
