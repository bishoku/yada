import { particleCaptureMatrix } from './particleCaptureGeometry';
import { loadCaptureImage } from './captureImage';
import { applyCaptureFraming, type CaptureFraming } from './captureFraming';
import { flushSync } from 'react-dom';
import { toSvg } from 'html-to-image';
import { captureFontCSS } from './captureFonts';
import { useAppStore } from '../store/useAppStore';
import { simulationClock } from '../store/simulationClock';
import { withFullSequenceRendering } from '../services/sequenceCapture';
import { withAnimatedCapture } from '../services/animatedCapture';
import { prepareDocumentIcons } from './captureAssets';
import { withCaptureLock } from '../services/captureLock';
import { canvasBackground, excludeCaptureElement, hideCaptureElements } from './capturePolicy';
import { message } from '../i18n/messages';

export interface SceneParticle { id: string; sprite: number; matrix: number[] }
export interface SceneFrame { time: number; background: number; particles: SceneParticle[] }
export interface CaptureScene {
  width: number; height: number; dark: boolean; duration: number; fps: number; color: string;
  backgrounds: string[]; sprites: string[]; frames: SceneFrame[];
  metrics: { captureMs: number; snapshots: number; frames: number; serializedBytes: number };
}
export function captureTimes(duration: number, fps: number): number[] {
  if (!Number.isFinite(duration) || duration < 0 || !Number.isFinite(fps) || fps < 1 || fps > 60) throw new Error('Invalid capture timing');
  if (duration === 0) return [0];
  const count = Math.max(1, Math.ceil(duration * fps / 1000));
  return Array.from({length: count + 1}, (_, i) => Math.min(duration, i * 1000 / fps));
}
function particleSprite(element: SVGGraphicsElement, bounds: DOMRect) {
  if (getComputedStyle(element).display === 'none') return null;
  const reported = element.getScreenCTM();
  if (!reported) return null;
  const screen = element.getBoundingClientRect();
  const matrix = particleCaptureMatrix(reported,element.getBBox(),screen,bounds);
  const clone = element.cloneNode(true) as SVGGraphicsElement;
  let x = matrix.e, y = matrix.f;
  const circle = element.tagName.toLowerCase() === 'circle';
  if (circle) {
    const cx = Number(element.getAttribute('cx') ?? 0), cy = Number(element.getAttribute('cy') ?? 0);
    x += matrix.a * cx + matrix.c * cy; y += matrix.b * cx + matrix.d * cy;
    clone.setAttribute('cx', '0'); clone.setAttribute('cy', '0');
  }
  clone.removeAttribute('transform'); clone.removeAttribute('style'); clone.removeAttribute('class');
  const upright = clone.querySelector('[data-particle-upright]');
  upright?.removeAttribute('transform');
  // SVG images have their own document; carry the circle's computed colour explicitly.
  if (circle) { clone.setAttribute('fill', getComputedStyle(element).fill); clone.removeAttribute('filter'); }
  const markup = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="-18 -18 36 36">${markup}</svg>`;
  const scale = Math.hypot(matrix.a, matrix.b);
  return { src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, matrix: upright ? [scale,0,0,scale,x,y] : [matrix.a,matrix.b,matrix.c,matrix.d,x,y] };
}

/** Record actual DOM states once, plus small moving sprites. No full-size per-frame canvases. */
async function captureCanvasSceneInternal(selector: string, duration: number, fps: number, progress: (value: number) => void = () => {}, reuseBackgrounds = true, framing: CaptureFraming = 'viewport'): Promise<CaptureScene> {
  const node = document.querySelector<HTMLElement>(selector);
  if (!node) throw new Error(message(useAppStore.getState().language, 'exportMedia.captureFailed'));
  const times = captureTimes(duration, fps), initial = useAppStore.getState();
  const documentOwner = initial.logicalData, visualOwner = initial.visualData, originalTime = simulationClock.getTime(), playing = initial.isPlaying;
  const originalLang = node.getAttribute('lang');
  node.setAttribute('lang',initial.language);
  const start = performance.now();
  flushSync(() => initial.pausePlayback());
  const freeze = document.createElement('style');
  freeze.dataset.yadaCapture = 'true';
  freeze.textContent = `${selector}, ${selector} * { transition: none !important; animation: none !important; }`;
  document.head.appendChild(freeze);
  const scene: CaptureScene = { width: node.clientWidth, height: node.clientHeight, dark: document.documentElement.classList.contains('dark'), duration, fps, color: canvasBackground(node), backgrounds: [], sprites: [], frames: [], metrics: { captureMs: 0, snapshots: 0, frames: times.length, serializedBytes: 0 } };
  const backgrounds = new Map<string, number>(), sprites = new Map<string, number>();
  try {
    return await withFullSequenceRendering(() => withAnimatedCapture(async () => {
      await applyCaptureFraming(framing);
      await prepareDocumentIcons();
      // Fonts are embedded once per capture operation, then reused by html-to-image.
      const fontEmbedCSS = await captureFontCSS(node);
      for (let index = 0; index < times.length; index++) {
        if (useAppStore.getState().logicalData !== documentOwner || useAppStore.getState().visualData !== visualOwner) throw new Error(message(initial.language, 'exportMedia.sceneChanged'));
        flushSync(() => initial.setCurrentTime(times[index]));
        // Mounting an active particle runs its ref subscription in an effect.
        simulationClock.setTime(times[index]);
        const key = JSON.stringify(Array.from(node.querySelectorAll('[data-capture-state]'), element => element.getAttribute('data-capture-state')));
        let background = reuseBackgrounds ? backgrounds.get(key) : undefined;
        if (background === undefined) {
          const restore = hideCaptureElements(node,true);
          try {
            const src = await toSvg(node, { width: scene.width, height: scene.height, backgroundColor: scene.color, fontEmbedCSS,
              filter: element => !excludeCaptureElement(element as HTMLElement, true) });
            background = scene.backgrounds.length; scene.backgrounds.push(src); backgrounds.set(key, background);
          } finally { restore(); }
        }
        const particles: SceneParticle[] = [];
        const bounds = node.getBoundingClientRect();
        node.querySelectorAll<SVGGraphicsElement>('[data-capture-particle]').forEach(element => {
          const sprite = particleSprite(element, bounds);
          if (!sprite) return;
          let spriteIndex = sprites.get(sprite.src);
          if (spriteIndex === undefined) { spriteIndex = scene.sprites.length; sprites.set(sprite.src, spriteIndex); scene.sprites.push(sprite.src); }
          particles.push({ id: element.getAttribute('data-particle-id') ?? String(particles.length), sprite: spriteIndex, matrix: sprite.matrix });
        });
        scene.frames.push({ time: times[index], background, particles });
        progress(Math.round((index + 1) / times.length * 100));
        if (index % 10 === 0) await new Promise<void>(resolve => setTimeout(resolve, 0));
      }
      scene.metrics.captureMs = performance.now() - start;
      scene.metrics.snapshots = scene.backgrounds.length;
      scene.metrics.serializedBytes = JSON.stringify(scene).length;
      return scene;
    }));
  } finally {
    freeze.remove();
    if (originalLang === null) node.removeAttribute('lang'); else node.setAttribute('lang',originalLang);
    // A different document must never receive the old document's playback position.
    if (useAppStore.getState().logicalData === documentOwner) flushSync(() => { initial.setCurrentTime(originalTime); if (playing) initial.resumePlayback(); });
  }
}

export function loadSceneImage(src: string, resolution?: {width:number;height:number}): Promise<HTMLImageElement> {
  if (resolution && src.startsWith('data:image/svg+xml')) {
    const svg = new DOMParser().parseFromString(decodeURIComponent(src.slice(src.indexOf(',')+1)), 'image/svg+xml');
    svg.documentElement.setAttribute('width',String(resolution.width)); svg.documentElement.setAttribute('height',String(resolution.height));
    src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
  }
  return loadCaptureImage(src);
}
/** Two background bitmaps and small sprite images are retained, independently of video length. */
export async function createSceneRenderer(scene: CaptureScene, width: number, height: number) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const scale = Math.min(width / scene.width, height / scene.height), contentWidth = scene.width * scale, contentHeight = scene.height * scale;
  const offsetX = (width - contentWidth) / 2, offsetY = (height - contentHeight) / 2;
  const backgrounds = new Map<number, HTMLImageElement>();
  const sprites = new Map<number, HTMLImageElement>();
  const render = async (index: number) => {
    const frame = scene.frames[index];
    let image = backgrounds.get(frame.background);
    if (!image) { image = await loadSceneImage(scene.backgrounds[frame.background],{width:Math.ceil(contentWidth),height:Math.ceil(contentHeight)}); backgrounds.set(frame.background, image); }
    else { backgrounds.delete(frame.background); backgrounds.set(frame.background, image); }
    if (backgrounds.size > 2) { const oldest=backgrounds.keys().next().value!; backgrounds.get(oldest)!.src=''; backgrounds.delete(oldest); }
    ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,width,height); ctx.fillStyle = scene.color; ctx.fillRect(0,0,width,height);
    ctx.drawImage(image,offsetX,offsetY,contentWidth,contentHeight);
    const sx = scale, sy = scale;
    for (const particle of frame.particles) {
      const [a,b,c,d,e,f] = particle.matrix;
      ctx.setTransform(sx*a,sy*b,sx*c,sy*d,sx*e+offsetX,sy*f+offsetY);
      let sprite = sprites.get(particle.sprite);
      if (!sprite) { sprite = await loadSceneImage(scene.sprites[particle.sprite]); sprites.set(particle.sprite, sprite); }
      else { sprites.delete(particle.sprite); sprites.set(particle.sprite, sprite); }
      if (sprites.size > 32) { const oldest=sprites.keys().next().value!; sprites.get(oldest)!.src=''; sprites.delete(oldest); }
      ctx.drawImage(sprite,-18,-18,36,36);
    }
    ctx.setTransform(1,0,0,1,0,0);
    return canvas;
  };
  return { canvas, render, dispose: () => { for (const image of [...backgrounds.values(),...sprites.values()]) image.src=''; backgrounds.clear(); sprites.clear(); canvas.width = canvas.height = 1; } };
}

export const captureCanvasScene = (...args: Parameters<typeof captureCanvasSceneInternal>) => withCaptureLock(() => captureCanvasSceneInternal(...args));
