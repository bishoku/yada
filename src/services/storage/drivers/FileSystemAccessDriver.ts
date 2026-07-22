import { IStorageDriver, StorageMode } from '../types';
import { IDBHandleService } from '../idbHandle';

const PREFERENCES_FILE = 'preferences.json';
const GLOBAL_COMPONENTS_DIR = 'components';

const generateId = () => Math.random().toString(36).substring(2, 9);

export class FileSystemAccessDriver implements IStorageDriver {
  private rootHandle: FileSystemDirectoryHandle | null = null;

  constructor(handle?: FileSystemDirectoryHandle) {
    if (handle) {
      this.rootHandle = handle;
    }
  }

  getMode(): StorageMode {
    return 'fs-access';
  }

  public setRootHandle(handle: FileSystemDirectoryHandle) {
    this.rootHandle = handle;
  }

  public getRootHandle(): FileSystemDirectoryHandle | null {
    return this.rootHandle;
  }

  public static isSupported(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  }

  public static async selectDirectory(): Promise<FileSystemDirectoryHandle | null> {
    if (!FileSystemAccessDriver.isSupported()) {
      throw new Error('File System Access API is not supported in this browser');
    }
    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });
      await IDBHandleService.saveDirectoryHandle(handle);
      return handle;
    } catch (err: any) {
      if (err.name === 'AbortError') return null; // User cancelled
      throw err;
    }
  }

  public async checkPermission(): Promise<'granted' | 'prompt' | 'denied' | 'no-handle'> {
    if (!this.rootHandle) {
      this.rootHandle = await IDBHandleService.getDirectoryHandle();
    }
    if (!this.rootHandle) return 'no-handle';

    if ('queryPermission' in this.rootHandle) {
      return await (this.rootHandle as any).queryPermission({ mode: 'readwrite' });
    }
    return 'granted';
  }

  public async requestPermission(): Promise<boolean> {
    if (!this.rootHandle) {
      this.rootHandle = await IDBHandleService.getDirectoryHandle();
    }
    if (!this.rootHandle) return false;

    if ('requestPermission' in this.rootHandle) {
      const state = await (this.rootHandle as any).requestPermission({ mode: 'readwrite' });
      return state === 'granted';
    }
    return true;
  }

  private async ensureRootHandle(): Promise<FileSystemDirectoryHandle> {
    if (!this.rootHandle) {
      this.rootHandle = await IDBHandleService.getDirectoryHandle();
    }
    if (!this.rootHandle) {
      throw new Error('No local folder selected. Please select a folder in Preferences.');
    }

    // Verify/request permission if required by browser
    if ('queryPermission' in this.rootHandle) {
      const state = await (this.rootHandle as any).queryPermission({ mode: 'readwrite' });
      if (state === 'prompt') {
        try {
          const reqState = await (this.rootHandle as any).requestPermission({ mode: 'readwrite' });
          if (reqState !== 'granted') {
            throw new Error('PERMISSION_PROMPT_REQUIRED');
          }
        } catch {
          throw new Error('PERMISSION_PROMPT_REQUIRED');
        }
      } else if (state === 'denied') {
        throw new Error('Permission to access local folder was denied');
      }
    }

    return this.rootHandle;
  }

  private sanitizePath(inputPath: string): string {
    if (!inputPath) return '';
    // Strip leading slashes
    let cleaned = inputPath.replace(/^[\/\\]+/, '');
    // If absolute path containing .yada, strip up to .yada/
    const yadaIdx = cleaned.indexOf('.yada/');
    if (yadaIdx !== -1) {
      cleaned = cleaned.substring(yadaIdx + 6);
    }
    return cleaned;
  }

  // --- Helper Methods for File Operations ---
  private async getDirectoryHandleForPath(root: FileSystemDirectoryHandle, dirPath: string, create = false): Promise<FileSystemDirectoryHandle> {
    const cleaned = this.sanitizePath(dirPath);
    if (!cleaned) return root;
    const parts = cleaned.split(/[\/\\]+/).filter(Boolean);
    let current = root;
    for (const part of parts) {
      current = await current.getDirectoryHandle(part, { create });
    }
    return current;
  }

  private async getFileHandle(root: FileSystemDirectoryHandle, filePath: string, create = false): Promise<FileSystemFileHandle> {
    const cleaned = this.sanitizePath(filePath);
    const parts = cleaned.split(/[\/\\]+/).filter(Boolean);
    const fileName = parts.pop()!;
    const parentDir = parts.length > 0 ? await this.getDirectoryHandleForPath(root, parts.join('/'), create) : root;
    return await parentDir.getFileHandle(fileName, { create });
  }

  private async readTextFileByPath(filePath: string): Promise<string> {
    const root = await this.ensureRootHandle();
    try {
      const fileHandle = await this.getFileHandle(root, filePath, false);
      const file = await fileHandle.getFile();
      return await file.text();
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw err;
    }
  }

  private async writeTextFileByPath(filePath: string, content: string): Promise<void> {
    const root = await this.ensureRootHandle();
    const fileHandle = await this.getFileHandle(root, filePath, true);
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  private async deleteFileByPath(filePath: string): Promise<void> {
    const root = await this.ensureRootHandle();
    const cleaned = this.sanitizePath(filePath);
    const parts = cleaned.split(/[\/\\]+/).filter(Boolean);
    const fileName = parts.pop()!;
    const parentDir = parts.length > 0 ? await this.getDirectoryHandleForPath(root, parts.join('/'), false) : root;
    try {
      await parentDir.removeEntry(fileName, { recursive: true });
    } catch (err: any) {
      if (err.name !== 'NotFoundError') throw err;
    }
  }

  // --- Workspaces ---
  async create_workspace(name: string, description: string): Promise<string> {
    const root = await this.ensureRootHandle();
    const wsPath = name; // Subfolder named after workspace
    
    // Create workspace directory & diagrams subfolder (Tauri format)
    await this.getDirectoryHandleForPath(root, wsPath, true);
    await this.getDirectoryHandleForPath(root, `${wsPath}/diagrams`, true);

    const now = new Date().toISOString();
    const ws: any = {
      id: generateId(),
      name,
      description,
      createdAt: now,
      lastAccessed: now,
      path: wsPath,
    };

    // Save workspace.json inside workspace directory
    await this.writeTextFileByPath(`${wsPath}/workspace.json`, JSON.stringify(ws, null, 2));

    return JSON.stringify(ws);
  }

  async load_workspace(path: string): Promise<string> {
    const cleanedPath = this.sanitizePath(path);
    const wsFile = `${cleanedPath}/workspace.json`;
    return await this.readTextFileByPath(wsFile);
  }

  async save_workspace(metaJson: string): Promise<void> {
    const ws = JSON.parse(metaJson);
    const cleanedPath = this.sanitizePath(ws.path);
    
    ws.lastAccessed = new Date().toISOString();
    delete ws.lastModified;
    await this.writeTextFileByPath(`${cleanedPath}/workspace.json`, JSON.stringify(ws, null, 2));
  }

  async get_recent_workspaces(): Promise<string> {
    const root = await this.ensureRootHandle();
    const foundWorkspaces: any[] = [];

    // Scan all subdirectories in root for workspace.json
    try {
      for await (const entry of (root as any).values()) {
        if (entry.kind === 'directory') {
          try {
            const wsJsonHandle = await entry.getFileHandle('workspace.json', { create: false });
            const file = await wsJsonHandle.getFile();
            const content = await file.text();
            const wsMeta = JSON.parse(content);
            const cleaned = entry.name;
            foundWorkspaces.push({
              ...wsMeta,
              path: cleaned
            });
          } catch {
            // Not a workspace directory
          }
        }
      }
    } catch {
      // ignore scan error
    }

    foundWorkspaces.sort((a: any, b: any) => new Date(b.lastAccessed || b.createdAt || 0).getTime() - new Date(a.lastAccessed || a.createdAt || 0).getTime());
    return JSON.stringify(foundWorkspaces);
  }

  async delete_workspace(path: string): Promise<void> {
    const cleanedPath = this.sanitizePath(path);
    await this.deleteFileByPath(cleanedPath);
  }

  // --- Diagrams ---
  async save_diagram(path: string, diagramId: string, logicalJson: string, visualJson: string, _diagramFileJson?: string): Promise<void> {
    const cleanedPath = this.sanitizePath(path);
    const logicalVal = JSON.parse(logicalJson);
    const visualVal = JSON.parse(visualJson);

    // Save in exact Tauri format: diagrams/{diagramId}_logical.json and diagrams/{diagramId}_visual.json
    const logicalPath = `${cleanedPath}/diagrams/${diagramId}_logical.json`;
    const visualPath = `${cleanedPath}/diagrams/${diagramId}_visual.json`;

    await this.writeTextFileByPath(logicalPath, JSON.stringify(logicalVal, null, 2));
    await this.writeTextFileByPath(visualPath, JSON.stringify(visualVal, null, 2));
  }

  async load_diagram(path: string, diagramId: string = 'default'): Promise<string> {
    const cleanedPath = this.sanitizePath(path);

    // 1. Try reading Tauri format: diagrams/{diagramId}_logical.json and diagrams/{diagramId}_visual.json
    try {
      const logicalStr = await this.readTextFileByPath(`${cleanedPath}/diagrams/${diagramId}_logical.json`);
      let visualStr = '{"canvas":{"zoom":1,"pan":{"x":0,"y":0}},"layoutNodes":{}}';
      try {
        visualStr = await this.readTextFileByPath(`${cleanedPath}/diagrams/${diagramId}_visual.json`);
      } catch {
        // use default visual
      }

      const payload = {
        schemaVersion: JSON.parse(logicalStr).schemaVersion ?? 1,
        logicalData: JSON.parse(logicalStr),
        visualData: JSON.parse(visualStr),
      };
      return JSON.stringify(payload);
    } catch {
      // fallback to legacy single file
    }

    // 2. Try root logical.json & visual.json (Tauri legacy fallback)
    try {
      const logicalStr = await this.readTextFileByPath(`${cleanedPath}/logical.json`);
      let visualStr = '{"canvas":{"zoom":1,"pan":{"x":0,"y":0}},"layoutNodes":{}}';
      try {
        visualStr = await this.readTextFileByPath(`${cleanedPath}/visual.json`);
      } catch {
        // ignore
      }

      const payload = {
        schemaVersion: JSON.parse(logicalStr).schemaVersion ?? 1,
        logicalData: JSON.parse(logicalStr),
        visualData: JSON.parse(visualStr),
      };
      return JSON.stringify(payload);
    } catch {
      // fallback
    }

    // 3. Try ${diagramId}.json
    return await this.readTextFileByPath(`${cleanedPath}/${diagramId}.json`);
  }

  // --- Preferences ---
  async save_preferences(preferencesJson: string): Promise<void> {
    await this.writeTextFileByPath(PREFERENCES_FILE, preferencesJson);
  }

  async load_preferences(): Promise<string> {
    try {
      return await this.readTextFileByPath(PREFERENCES_FILE);
    } catch {
      return '{}';
    }
  }

  // --- Global Components / Generic Files ---
  async get_global_components_dir(): Promise<string> {
    return GLOBAL_COMPONENTS_DIR;
  }

  async save_text_file(path: string, content: string): Promise<void> {
    const cleanedPath = this.sanitizePath(path);
    await this.writeTextFileByPath(cleanedPath, content);
  }

  async read_text_file(path: string): Promise<string> {
    const cleanedPath = this.sanitizePath(path);
    return await this.readTextFileByPath(cleanedPath);
  }

  async list_json_files_in_dir(dirPath: string): Promise<string[]> {
    const root = await this.ensureRootHandle();
    const cleanedPath = this.sanitizePath(dirPath);
    
    try {
      const dirHandle = await this.getDirectoryHandleForPath(root, cleanedPath, false);
      const files: string[] = [];

      for await (const entry of (dirHandle as any).values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json')) {
          const file = await entry.getFile();
          const content = await file.text();
          files.push(content);
        }
      }
      return files;
    } catch {
      return [];
    }
  }

  async delete_file(path: string): Promise<void> {
    const cleanedPath = this.sanitizePath(path);
    await this.deleteFileByPath(cleanedPath);
  }
}
