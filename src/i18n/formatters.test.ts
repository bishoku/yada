import { formatWorkspaceDate } from './formatters';
import { describe, expect, it } from 'vitest';
import { formatDateTime, getStorageDescription, interpolate } from './formatters';
import { translations } from './translations';

describe('localized workspace presentation', () => {
  it('handles missing and invalid dates without exposing invalid values', () => {
    for (const language of ['tr', 'en'] as const) {
      for (const value of [null, undefined, '', 'invalid-date']) {
        expect(formatDateTime(value, language)).toBe(translations[language].commonUi.unknownDate);
      }
      expect(formatDateTime('2026-10-16T10:30:00Z', language)).not.toBe(translations[language].commonUi.unknownDate);
    }
  });
  it('distinguishes browser, folder, cloud and host persistence', () => {
    for (const language of ['tr', 'en'] as const) {
      expect(getStorageDescription('localstorage', language)).toBe(translations[language].commonUi.browserStorage);
      expect(getStorageDescription('fs-access', language)).toBe(translations[language].commonUi.folderStorage);
      expect(getStorageDescription('icloud-drive', language)).toBe(translations[language].commonUi.cloudStorage);
      expect(getStorageDescription('tauri', language)).toBe(translations[language].commonUi.nativeStorage);
      for (const host of ['embed', 'forge', 'confluence-dc'] as const) {
        expect(getStorageDescription(host, language)).toBe(translations[language].commonUi.hostStorage);
      }
    }
  });
  it('inserts user text literally and leaves unknown parameters visible', () => {
    expect(interpolate('Import {name}', { name: '$& {other}' })).toBe('Import $& {other}');
    expect(interpolate('{unknown}', {})).toBe('{unknown}');
  });
});


it('uses valid legacy workspace dates without inventing a new access time', () => {
  const date='2026-10-16T12:00:00.000Z';
  for (const language of ['tr','en'] as const) {
    expect(formatWorkspaceDate({lastModified:date},language)).toBe(formatDateTime(date,language));
    expect(formatWorkspaceDate({lastAccessed:'invalid',lastModified:date},language)).toBe(formatDateTime(date,language));
    expect(formatWorkspaceDate({},language)).toBe(formatDateTime(null,language));
  }
});
