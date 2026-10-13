import { afterEach, describe, expect, it, vi } from 'vitest';
import { ForgeDriver } from './ForgeDriver';
import { ConfluenceDcDriver } from './ConfluenceDcDriver';
import { EmbedIframeDriver } from './EmbedIframeDriver';
import { LocalStorageDriver } from './LocalStorageDriver';
import { useAppStore } from '../../../store/useAppStore';
import { generatePngDataUrl } from '../../../utils/exportMedia';
const invoke = vi.hoisted(() => vi.fn());
vi.mock('@forge/bridge', () => ({ invoke }));
vi.mock('../../../utils/exportMedia', () => ({ generatePngDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,preview') }));
vi.mock('../../confluenceDcBridge', () => ({ isConfluenceDC: () => false, getConfluenceDcContext: () => ({ pageId: '123', macroId: 'macro', restBaseUrl: '/rest/yada/1.0' }) }));
const original = useAppStore.getState();
afterEach(() => { useAppStore.setState(original, true); vi.restoreAllMocks(); vi.unstubAllGlobals(); invoke.mockReset(); });
describe('host save failure boundaries', () => {
  it('propagates Forge save errors rather than acknowledging a browser-local fallback', async () => {
    const fallback = vi.spyOn(LocalStorageDriver.prototype, 'save_diagram');
    invoke.mockRejectedValue(new Error('Forge denied'));
    await expect(new ForgeDriver().save_diagram('forge://macro', 'default', '{}', '{}')).rejects.toThrow('Forge denied');
    expect(fallback).not.toHaveBeenCalled();
  });
  it('propagates Data Center HTTP failures rather than acknowledging local storage', async () => {
    const fallback = vi.spyOn(LocalStorageDriver.prototype, 'save_diagram');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, statusText: 'Forbidden' }));
    await expect(new ConfluenceDcDriver().save_diagram('confluence-dc://123/macro', 'default', '{}', '{}')).rejects.toThrow('403');
    expect(fallback).not.toHaveBeenCalled();
  });
  it('preserves the Data Center attachment payload for successful saves', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', fetch);
    await new ConfluenceDcDriver().save_diagram('confluence-dc://123/macro', 'default', '{}', '{}');
    const payload = JSON.parse(fetch.mock.calls[0][1].body);
    expect(payload).toMatchObject({ pageId: '123', macroId: 'macro', diagramId: 'default', pngDataUri: 'data:image/png;base64,preview' });
  });
  it.each([false, true])('does not close embed after failed save or newer edits (saved=%s)', async saved => {
    let listener!: (event: { data: unknown }) => void;
    const postMessage = vi.fn();
    vi.stubGlobal('window', { addEventListener: (_type: string, callback: typeof listener) => { listener = callback; }, parent: { postMessage } });
    new EmbedIframeDriver(); postMessage.mockClear();
    useAppStore.setState({ manualSave: vi.fn().mockResolvedValue(saved), isDirty: true });
    listener({ data: { type: 'REQUEST_SAVE_AND_CLOSE' } });
    await vi.waitFor(() => expect(useAppStore.getState().manualSave).toHaveBeenCalled());
    expect(postMessage).not.toHaveBeenCalled();
  });
  it('closes embed after a successful save and keeps the existing message protocol', async () => {
    let listener!: (event: { data: unknown }) => void;
    const postMessage = vi.fn();
    vi.stubGlobal('window', { addEventListener: (_type: string, callback: typeof listener) => { listener = callback; }, parent: { postMessage } });
    const driver = new EmbedIframeDriver();
    await driver.save_diagram('embed://workspace/default', 'default', '{"nodes":[]}', '{}');
    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'SAVE_DIAGRAM', payload: expect.objectContaining({ logicalJson: '{"nodes":[]}', visualJson: '{}' }) }), '*');
    expect(generatePngDataUrl).toHaveBeenCalled();
    useAppStore.setState({ manualSave: vi.fn().mockResolvedValue(true), isDirty: false });
    listener({ data: { type: 'REQUEST_SAVE_AND_CLOSE' } });
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalledWith({ type: 'CLOSE_DIAGRAM' }, '*'));
  });
});
