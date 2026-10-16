import { describe, expect, it, vi } from 'vitest';
import { registerNativeCloseGuard } from './nativeCloseGuard';
import capabilities from '../../src-tauri/capabilities/default.json';

async function fixture(save: () => Promise<boolean>) {
  const state = { isDirty: true, isSaving: false, isReadOnly: false, viewMode: 'freeform' };
  let handler!: (event: { preventDefault(): void }) => void | Promise<void>;
  const unlisten = vi.fn();
  const host = { onCloseRequested: async (callback: typeof handler) => { handler = callback; return unlisten; }, close: vi.fn(async () => {}) };
  const onError = vi.fn();
  const dispose = await registerNativeCloseGuard(host, () => state, save, onError);
  const request = () => { const event = { preventDefault: vi.fn() }; return { event, finished: handler(event) }; };
  return { state, host, request, dispose, unlisten, onError };
}

describe('native close save boundary', () => {
  it('allows the main window to complete the native close handshake', () => {
    expect(capabilities.windows).toEqual(['main']);
    expect(capabilities.permissions).toContain('core:window:allow-close');
    expect(capabilities.permissions).toContain('core:window:allow-destroy');
  });
  it('allows a clean window to close without writing', async () => {
    const save = vi.fn(async () => true), f = await fixture(save);
    f.state.isDirty = false;
    const request = f.request(); await request.finished;
    expect(request.event.preventDefault).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });
  it('prevents closing synchronously and keeps the window open on failed saves', async () => {
    const f = await fixture(async () => false);
    const request = f.request();
    expect(request.event.preventDefault).toHaveBeenCalledOnce();
    await request.finished;
    expect(f.host.close).not.toHaveBeenCalled();
  });
  it('closes only after acknowledgement of the latest edits', async () => {
    const f = await fixture(async () => { f.state.isDirty = false; return true; });
    await f.request().finished;
    expect(f.host.close).toHaveBeenCalledOnce();
  });
  it('reports unexpected write failures while keeping the window open', async () => {
    const error = new Error('Filesystem unavailable');
    const f = await fixture(async () => { throw error; });
    await f.request().finished;
    expect(f.host.close).not.toHaveBeenCalled();
    expect(f.onError).toHaveBeenCalledWith(error);
  });
  it('does not close when new edits remain after a successful write', async () => {
    const f = await fixture(async () => true);
    await f.request().finished;
    expect(f.host.close).not.toHaveBeenCalled();
  });
  it('waits for an in-progress save even when the dirty flag is clear', async () => {
    const save = vi.fn(async () => false), f = await fixture(save);
    f.state.isDirty = false; f.state.isSaving = true;
    const request = f.request(); await request.finished;
    expect(request.event.preventDefault).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledOnce();
    expect(f.host.close).not.toHaveBeenCalled();
  });
  it('coalesces close requests during a pending save and cancels after disposal', async () => {
    let resolve!: (saved: boolean) => void;
    const save = vi.fn(() => new Promise<boolean>(done => { resolve = done; }));
    const f = await fixture(save), first = f.request(), second = f.request();
    expect(second.event.preventDefault).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledOnce();
    f.dispose(); f.state.isDirty = false; resolve(true);
    await first.finished;
    expect(f.host.close).not.toHaveBeenCalled();
    expect(f.unlisten).toHaveBeenCalledOnce();
  });
});
