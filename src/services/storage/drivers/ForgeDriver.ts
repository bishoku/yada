import { IStorageDriver, StorageMode } from '../types';
import { LocalStorageDriver } from './LocalStorageDriver';

const safeForgeInvoke = async (functionKey: string, payload?: any): Promise<any> => {
  try {
    const { invoke } = await import('@forge/bridge');
    return await invoke(functionKey, payload);
  } catch (err) {
    console.warn(`Forge invoke failed for ${functionKey}:`, err);
    throw err;
  }
};

export class ForgeDriver implements IStorageDriver {
  private fallbackDriver = new LocalStorageDriver();

  getMode(): StorageMode {
    return 'forge';
  }

  async create_workspace(name: string, description: string): Promise<string> {
    try {
      const ws = await safeForgeInvoke('createWorkspace', { name, description });
      return JSON.stringify(ws);
    } catch {
      return this.fallbackDriver.create_workspace(name, description);
    }
  }

  async load_workspace(path: string): Promise<string> {
    try {
      const ws = await safeForgeInvoke('loadWorkspace', { path });
      return JSON.stringify(ws);
    } catch {
      return this.fallbackDriver.load_workspace(path);
    }
  }

  async save_workspace(metaJson: string): Promise<void> {
    try {
      await safeForgeInvoke('saveWorkspace', { metaJson });
      return;
    } catch {
      return this.fallbackDriver.save_workspace(metaJson);
    }
  }

  async get_recent_workspaces(): Promise<string> {
    try {
      const workspaces = await safeForgeInvoke('getRecentWorkspaces');
      return JSON.stringify(workspaces);
    } catch {
      return this.fallbackDriver.get_recent_workspaces();
    }
  }

  async delete_workspace(path: string): Promise<void> {
    try {
      await safeForgeInvoke('deleteWorkspace', { path });
      return;
    } catch {
      return this.fallbackDriver.delete_workspace(path);
    }
  }

  async save_diagram(path: string, diagramId: string, logicalJson: string, visualJson: string, diagramFileJson?: string): Promise<void> {
    try {
      await safeForgeInvoke('saveDiagram', { path, diagramId, logicalJson, visualJson, diagramFileJson });
      console.log('[ForgeDriver] Diagram successfully saved to Forge Storage API for path:', path);
      return;
    } catch (err) {
      console.error('[ForgeDriver] Failed to save to Forge Storage API, falling back to LocalStorage:', err);
      return this.fallbackDriver.save_diagram(path, diagramId, logicalJson, visualJson, diagramFileJson);
    }
  }

  async load_diagram(path: string, diagramId: string = 'default'): Promise<string> {
    try {
      const dataStr = await safeForgeInvoke('loadDiagram', { path, diagramId });
      console.log('[ForgeDriver] Diagram successfully loaded from Forge Storage API for path:', path);
      return dataStr;
    } catch (err) {
      console.warn('[ForgeDriver] Failed to load from Forge Storage API, trying LocalStorage fallback:', err);
      return this.fallbackDriver.load_diagram(path, diagramId);
    }
  }

  async save_preferences(preferencesJson: string): Promise<void> {
    try {
      await safeForgeInvoke('savePreferences', { preferencesJson });
      return;
    } catch {
      return this.fallbackDriver.save_preferences(preferencesJson);
    }
  }

  async load_preferences(): Promise<string> {
    try {
      const prefs = await safeForgeInvoke('loadPreferences');
      return typeof prefs === 'string' ? prefs : JSON.stringify(prefs || {});
    } catch {
      return this.fallbackDriver.load_preferences();
    }
  }

  async get_global_components_dir(): Promise<string> {
    return 'forge://global_components';
  }

  async save_text_file(path: string, content: string): Promise<void> {
    return this.fallbackDriver.save_text_file(path, content);
  }

  async read_text_file(path: string): Promise<string> {
    return this.fallbackDriver.read_text_file(path);
  }

  async list_json_files_in_dir(dirPath: string): Promise<string[]> {
    return this.fallbackDriver.list_json_files_in_dir(dirPath);
  }

  async delete_file(path: string): Promise<void> {
    return this.fallbackDriver.delete_file(path);
  }
}
