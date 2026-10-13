import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('./storage/drivers/EmbedIframeDriver', () => ({ EmbedIframeDriver: class {} }));
vi.mock('./storage/drivers/ForgeDriver', () => ({ ForgeDriver: class {} }));
vi.mock('./storage/drivers/ConfluenceDcDriver', () => ({ ConfluenceDcDriver: class {} }));
vi.mock('./storage/drivers/TauriDriver', () => ({ TauriDriver: class {} }));
vi.mock('./storage/drivers/LocalStorageDriver', () => ({ LocalStorageDriver: class {} }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue(undefined) }));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('storage host precedence', () => {
 it.each([
  ['forge', '?mode=modal&integration=iframe', 'forge'],
  ['confluence-dc', '?mode=modal&embed_editor=true', 'confluence-dc'],
  ['', '?target=confluence-dc&integration=iframe', 'confluence-dc'],
  ['', '?integration=iframe', 'embed'],
  ['', '?embed_editor=true', 'embed'],
  ['', '?embed=true', 'embed'],
  ['', '', 'localstorage'],
 ])('selects %s / %s as %s', async (target, search, mode) => {
  vi.resetModules(); vi.stubEnv('VITE_TARGET', target); vi.stubGlobal('window', { location: { search } });
  const { StorageService } = await import('./storage');
  expect(StorageService.getMode()).toBe(mode);
 });
});
