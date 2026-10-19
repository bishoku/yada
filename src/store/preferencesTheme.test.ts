import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAppStore } from './useAppStore';
import { StorageService } from '../services/storage';

const initial = useAppStore.getState();
beforeEach(() => {
  vi.stubGlobal('document', { documentElement: { classList: { add: vi.fn(), remove: vi.fn() } } });
  vi.stubGlobal('window', { location: { search: '', href: 'https://yada.test/' } });
  vi.stubGlobal('navigator', { language: 'tr-TR' });
  vi.spyOn(useAppStore.getState(), 'loadLibrary').mockResolvedValue();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); useAppStore.setState(initial, true); });

it('starts with light before preferences load', () => {
  expect(useAppStore.getInitialState().theme).toBe('light');
});
for (const preferences of ['{}', '{"theme":"unknown"}']) it(`uses light without a valid saved theme: ${preferences}`, async () => {
  vi.spyOn(StorageService, 'load_preferences').mockResolvedValue(preferences);
  await useAppStore.getState().loadAppPreferences();
  expect(useAppStore.getState().theme).toBe('light');
  expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
});
it('preserves a previously chosen theme', async () => {
  vi.spyOn(StorageService, 'load_preferences').mockResolvedValue('{"theme":"nord"}');
  await useAppStore.getState().loadAppPreferences();
  expect(useAppStore.getState().theme).toBe('nord');
});
it('uses light if preferences cannot be read', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(StorageService, 'load_preferences').mockRejectedValue(new Error('storage unavailable'));
  await useAppStore.getState().loadAppPreferences();
  expect(useAppStore.getState().theme).toBe('light');
});
