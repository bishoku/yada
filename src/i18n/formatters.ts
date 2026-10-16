import { translations, type Language } from './translations';
import type { StorageMode } from '../services/storage/types';

const dates = {
  tr: new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }),
  en: new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
};

export function formatDateTime(value: string | undefined | null, language: Language): string {
  const timestamp = value ? Date.parse(value) : NaN;
  return Number.isFinite(timestamp) ? dates[language].format(timestamp) : translations[language].commonUi.unknownDate;
}

/** Legacy browser workspaces expose lastModified instead of lastAccessed. */
export function formatWorkspaceDate(workspace: { lastAccessed?: string; createdAt?: string; lastModified?: string }, language: Language): string {
  const value = [workspace.lastAccessed,workspace.lastModified,workspace.createdAt].find(candidate => candidate && Number.isFinite(Date.parse(candidate)));
  return formatDateTime(value,language);
}

/** A replacement value is treated as plain text, including dollar signs. */
export function interpolate(message: string, values: Record<string, string | number>): string {
  return message.replace(/\{(\w+)\}/g, (token, key: string) => key in values ? String(values[key]) : token);
}

export function getStorageDescription(mode: StorageMode, language: Language): string {
  const t = translations[language].commonUi;
  switch (mode) {
    case 'localstorage': return t.browserStorage;
    case 'fs-access': return t.folderStorage;
    case 'tauri': return t.nativeStorage;
    case 'icloud-drive': return t.cloudStorage;
    case 'forge':
    case 'confluence-dc':
    case 'embed': return t.hostStorage;
  }
}

const numbers = { en: new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }), tr: new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }) };
export function formatPlaybackRate(value: number, language: Language): string {
  return numbers[language].format(value) + '×';
}
