import { useAppStore } from '../store/useAppStore';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isFullSequenceCapture, subscribeSequenceCapture, withFullSequenceRendering } from './sequenceCapture';
afterEach(() => vi.unstubAllGlobals());
describe('full sequence capture scope', () => {
  it('renders fully before capture and restores viewport rendering after completion', async () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1; });
    const changes: boolean[] = [];
    const unsubscribe = subscribeSequenceCapture(() => changes.push(isFullSequenceCapture()));
    expect(await withFullSequenceRendering(async () => { expect(isFullSequenceCapture()).toBe(true); return 'image'; })).toBe('image');
    expect(isFullSequenceCapture()).toBe(false);
    expect(changes).toEqual([true, false]);
    unsubscribe();
  });
  it('keeps overlapping captures complete until both finish, including failure', async () => {
    let release!: () => void;
    const first = withFullSequenceRendering(() => new Promise<void>(resolve => { release = resolve; }));
    await expect(withFullSequenceRendering(async () => { throw new Error('clone failed'); })).rejects.toThrow('clone failed');
    expect(isFullSequenceCapture()).toBe(true);
    release(); await first;
    expect(isFullSequenceCapture()).toBe(false);
  });
  it('restores viewport rendering when frame preparation fails', async () => {
    vi.stubGlobal('requestAnimationFrame', () => { throw new Error('frame failed'); });
    await expect(withFullSequenceRendering(async () => 'unused')).rejects.toThrow('frame failed');
    expect(isFullSequenceCapture()).toBe(false);
  });
  it('does not persist export fitting as a new unsaved document revision', async () => {
    const initial = useAppStore.getState();
    try {
      useAppStore.setState({ isDirty: false });
      const visual = useAppStore.getState().visualData;
      await withFullSequenceRendering(async () => {
        useAppStore.getState().updateCanvasViewport(0.1, { x: 200, y: 300 });
        expect(useAppStore.getState().visualData).toBe(visual);
        expect(useAppStore.getState().isDirty).toBe(false);
      });
      useAppStore.getState().updateCanvasViewport(0.2, { x: 100, y: 150 });
      expect(useAppStore.getState().visualData).not.toBe(visual);
      expect(useAppStore.getState().isDirty).toBe(true);
    } finally { useAppStore.setState(initial, true); }
  });

});
