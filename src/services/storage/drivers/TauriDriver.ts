import { invoke } from '@tauri-apps/api/core';
import { IStorageDriver, StorageMode } from '../types';

export class TauriDriver implements IStorageDriver {
  getMode(): StorageMode {
    return 'tauri';
  }

  async create_workspace(name: string, description: string): Promise<string> {
    return await invoke<string>('create_workspace', { name, description });
  }

  async load_workspace(path: string): Promise<string> {
    return await invoke<string>('load_workspace', { path });
  }

  async save_workspace(metaJson: string): Promise<void> {
    await invoke('save_workspace', { metaJson });
  }

  async get_recent_workspaces(): Promise<string> {
    return await invoke<string>('get_recent_workspaces');
  }

  async delete_workspace(path: string): Promise<void> {
    await invoke('delete_file', { path });
    const recentJson = await invoke<string>('get_recent_workspaces');
    const recent = JSON.parse(recentJson || '[]');
    const filtered = recent.filter((w: any) => w.path !== path);
    await invoke('save_recent_workspaces', { workspacesJson: JSON.stringify(filtered) });
  }

  async save_diagram(path: string, diagramId: string, logicalJson: string, visualJson: string, _diagramFileJson?: string): Promise<void> {
    await invoke('save_diagram', { path, diagramId, logicalJson, visualJson });
  }

  async load_diagram(path: string, diagramId: string = 'default'): Promise<string> {
    return await invoke<string>('load_diagram', { path, diagramId });
  }

  async save_preferences(preferencesJson: string): Promise<void> {
    await invoke('save_preferences', { preferencesJson });
  }

  async load_preferences(): Promise<string> {
    try {
      return await invoke<string>('load_preferences');
    } catch {
      return '{}';
    }
  }

  async get_global_components_dir(): Promise<string> {
    return await invoke<string>('get_global_components_dir');
  }

  async save_text_file(path: string, content: string): Promise<void> {
    await invoke('save_text_file', { path, content });
  }

  async read_text_file(path: string): Promise<string> {
    return await invoke<string>('read_text_file', { path });
  }

  async list_json_files_in_dir(dirPath: string): Promise<string[]> {
    return await invoke<string[]>('list_json_files_in_dir', { dirPath });
  }

  async delete_file(path: string): Promise<void> {
    await invoke('delete_file', { path });
  }
}
