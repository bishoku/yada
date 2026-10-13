import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPlatformCapabilities } from './platformCapabilities';

vi.mock('./storage', () => ({ isTauri: () => false }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('platform detection', () => {
  it.each(['forge', 'confluence-dc'])('restricts the %s build target without URL flags', (target) => {
    vi.stubEnv('VITE_TARGET', target);
    vi.stubGlobal('window', { location: { search: '' } });
    expect(getPlatformCapabilities()).toEqual({ canCollaborate: false, canCreateDiagram: false });
  });

  it.each([
    { location: { search: '' }, __FORGE_BRIDGE__: {} },
    { location: { search: '' }, __CONFLUENCE_DC__: true },
    { location: { search: '?target=confluence-dc' } },
    { location: { search: '' }, AJS: {} },
  ])('restricts a detected host context', (host) => {
    vi.stubEnv('VITE_TARGET', '');
    vi.stubGlobal('window', host);
    expect(getPlatformCapabilities()).toEqual({ canCollaborate: false, canCreateDiagram: false });
  });

  it('keeps ordinary web usage enabled', () => {
    vi.stubEnv('VITE_TARGET', '');
    vi.stubGlobal('window', { location: { search: '' } });
    expect(getPlatformCapabilities()).toEqual({ canCollaborate: true, canCreateDiagram: true });
  });
});
