import { IStorageDriver, StorageMode } from './storage/types';
import { TauriDriver } from './storage/drivers/TauriDriver';
import { LocalStorageDriver } from './storage/drivers/LocalStorageDriver';
import { FileSystemAccessDriver } from './storage/drivers/FileSystemAccessDriver';
import { ForgeDriver } from './storage/drivers/ForgeDriver';
import { IDBHandleService } from './storage/idbHandle';
import { EmbedIframeDriver } from './storage/drivers/EmbedIframeDriver';

import { isForge } from './forgeBridge';
export { isForge };

export const isTauri = () => {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
};

const STORAGE_MODE_KEY = 'yada_storage_mode';

class StorageManager implements IStorageDriver {
  private activeDriver: IStorageDriver;
  private mode: StorageMode;

  constructor() {
    const isEmbed = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('embed') === 'true';

    if (isEmbed) {
      this.activeDriver = new EmbedIframeDriver();
      this.mode = 'embed';
    } else if (isForge()) {
      this.activeDriver = new ForgeDriver();
      this.mode = 'forge';
    } else if (isTauri()) {
      this.activeDriver = new TauriDriver();
      const savedMode = (localStorage.getItem(STORAGE_MODE_KEY) as StorageMode) || 'tauri';
      this.mode = savedMode;
      // Sync with Rust backend asynchronously
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('set_backend_storage_mode', { mode: savedMode === 'icloud-drive' ? 'icloud' : 'localstorage' }).catch(console.error);
      }).catch(console.error);
    } else {
      const savedMode = (localStorage.getItem(STORAGE_MODE_KEY) as StorageMode) || 'localstorage';
      if (savedMode === 'fs-access' && FileSystemAccessDriver.isSupported()) {
        this.activeDriver = new FileSystemAccessDriver();
        this.mode = 'fs-access';
      } else {
        this.activeDriver = new LocalStorageDriver();
        this.mode = 'localstorage';
      }
    }
  }

  public getMode(): StorageMode {
    return this.mode;
  }

  public async setStorageMode(newMode: StorageMode): Promise<boolean> {
    if (isTauri()) {
      if (newMode === 'icloud-drive' || newMode === 'tauri') {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('set_backend_storage_mode', { mode: newMode === 'icloud-drive' ? 'icloud' : 'localstorage' });
        this.mode = newMode;
        localStorage.setItem(STORAGE_MODE_KEY, newMode);
        return true;
      }
      return false;
    }

    if (newMode === 'fs-access') {
      const handle = await FileSystemAccessDriver.selectDirectory();
      if (handle) {
        this.activeDriver = new FileSystemAccessDriver(handle);
        this.mode = 'fs-access';
        localStorage.setItem(STORAGE_MODE_KEY, 'fs-access');
        return true;
      }
      return false; // User cancelled
    } else {
      this.activeDriver = new LocalStorageDriver();
      this.mode = 'localstorage';
      localStorage.setItem(STORAGE_MODE_KEY, 'localstorage');
      return true;
    }
  }

  public async disconnectLocalFolder(): Promise<void> {
    await IDBHandleService.clearDirectoryHandle();
    await this.setStorageMode('localstorage');
  }

  public async checkLocalFolderPermission(): Promise<'granted' | 'prompt' | 'denied' | 'no-handle'> {
    if (this.activeDriver instanceof FileSystemAccessDriver) {
      return await this.activeDriver.checkPermission();
    }
    return 'granted';
  }

  public async requestLocalFolderPermission(): Promise<boolean> {
    if (this.activeDriver instanceof FileSystemAccessDriver) {
      return await this.activeDriver.requestPermission();
    }
    return true;
  }

  // --- Delegated IStorageDriver Methods ---
  create_workspace(name: string, description: string): Promise<string> {
    return this.activeDriver.create_workspace(name, description);
  }

  load_workspace(path: string): Promise<string> {
    return this.activeDriver.load_workspace(path);
  }

  save_workspace(metaJson: string): Promise<void> {
    return this.activeDriver.save_workspace(metaJson);
  }

  get_recent_workspaces(): Promise<string> {
    return this.activeDriver.get_recent_workspaces();
  }

  delete_workspace(path: string): Promise<void> {
    return this.activeDriver.delete_workspace(path);
  }

  save_diagram(path: string, diagramId: string, logicalJson: string, visualJson: string, diagramFileJson?: string): Promise<void> {
    return this.activeDriver.save_diagram(path, diagramId, logicalJson, visualJson, diagramFileJson);
  }

  load_diagram(path: string, diagramId: string = 'default'): Promise<string> {
    return this.activeDriver.load_diagram(path, diagramId);
  }

  save_preferences(preferencesJson: string): Promise<void> {
    return this.activeDriver.save_preferences(preferencesJson);
  }

  load_preferences(): Promise<string> {
    return this.activeDriver.load_preferences();
  }

  get_global_components_dir(): Promise<string> {
    return this.activeDriver.get_global_components_dir();
  }

  save_text_file(path: string, content: string): Promise<void> {
    return this.activeDriver.save_text_file(path, content);
  }

  read_text_file(path: string): Promise<string> {
    return this.activeDriver.read_text_file(path);
  }

  list_json_files_in_dir(dirPath: string): Promise<string[]> {
    return this.activeDriver.list_json_files_in_dir(dirPath);
  }

  delete_file(path: string): Promise<void> {
    return this.activeDriver.delete_file(path);
  }
}

export const StorageService = new StorageManager();
