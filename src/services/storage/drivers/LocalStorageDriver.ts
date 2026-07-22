import { IStorageDriver, StorageMode } from '../types';

const WEB_WORKSPACES_KEY = 'yada_workspaces';
const WEB_PREFS_KEY = 'yada_preferences';
const WEB_DIAGRAM_PREFIX = 'yada_data_';
const WEB_GLOBAL_COMPONENTS_DIR = 'virtual://global_components';

const generateId = () => Math.random().toString(36).substring(2, 9);

export class LocalStorageDriver implements IStorageDriver {
  getMode(): StorageMode {
    return 'localstorage';
  }

  async create_workspace(name: string, description: string): Promise<string> {
    const workspacesStr = localStorage.getItem(WEB_WORKSPACES_KEY) || '[]';
    const workspaces = JSON.parse(workspacesStr);
    
    const id = generateId();
    const virtualPath = `virtual://workspace/${id}`;
    
    const ws = {
      name,
      description,
      path: virtualPath,
      lastModified: new Date().toISOString(),
      dataDir: `${virtualPath}/data`
    };
    
    workspaces.push(ws);
    localStorage.setItem(WEB_WORKSPACES_KEY, JSON.stringify(workspaces));
    return JSON.stringify(ws);
  }

  async load_workspace(path: string): Promise<string> {
    const workspacesStr = localStorage.getItem(WEB_WORKSPACES_KEY) || '[]';
    const workspaces = JSON.parse(workspacesStr);
    const ws = workspaces.find((w: any) => w.path === path);
    if (!ws) throw new Error('Workspace not found');
    return JSON.stringify(ws);
  }

  async save_workspace(metaJson: string): Promise<void> {
    const ws = JSON.parse(metaJson);
    const workspacesStr = localStorage.getItem(WEB_WORKSPACES_KEY) || '[]';
    let workspaces = JSON.parse(workspacesStr);
    const index = workspaces.findIndex((w: any) => w.path === ws.path);
    
    if (index >= 0) {
      workspaces[index] = { ...workspaces[index], ...ws, lastModified: new Date().toISOString() };
    } else {
      workspaces.push(ws);
    }
    localStorage.setItem(WEB_WORKSPACES_KEY, JSON.stringify(workspaces));
  }

  async get_recent_workspaces(): Promise<string> {
    const workspacesStr = localStorage.getItem(WEB_WORKSPACES_KEY) || '[]';
    const workspaces = JSON.parse(workspacesStr);
    workspaces.sort((a: any, b: any) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    return JSON.stringify(workspaces);
  }

  async delete_workspace(path: string): Promise<void> {
    const workspacesStr = localStorage.getItem(WEB_WORKSPACES_KEY) || '[]';
    const workspaces = JSON.parse(workspacesStr);
    const filtered = workspaces.filter((w: any) => w.path !== path);
    localStorage.setItem(WEB_WORKSPACES_KEY, JSON.stringify(filtered));
    
    const dataKey = `${WEB_DIAGRAM_PREFIX}${path}`;
    localStorage.removeItem(dataKey);
  }

  async save_diagram(path: string, diagramId: string, logicalJson: string, visualJson: string, _diagramFileJson?: string): Promise<void> {
    const dataKey = `${WEB_DIAGRAM_PREFIX}${path}_${diagramId}`;
    const payload = {
      schemaVersion: JSON.parse(logicalJson).schemaVersion ?? 1,
      logicalData: JSON.parse(logicalJson),
      visualData: JSON.parse(visualJson),
    };
    localStorage.setItem(dataKey, JSON.stringify(payload));
  }

  async load_diagram(path: string, diagramId: string = 'default'): Promise<string> {
    let dataKey = `${WEB_DIAGRAM_PREFIX}${path}_${diagramId}`;
    let dataStr = localStorage.getItem(dataKey);
    
    if (!dataStr && diagramId === 'default') {
      const legacyKey = `${WEB_DIAGRAM_PREFIX}${path}`;
      dataStr = localStorage.getItem(legacyKey);
    }
    
    if (!dataStr) throw new Error('Diagram data not found');
    return dataStr;
  }

  async save_preferences(preferencesJson: string): Promise<void> {
    localStorage.setItem(WEB_PREFS_KEY, preferencesJson);
  }

  async load_preferences(): Promise<string> {
    return localStorage.getItem(WEB_PREFS_KEY) || '{}';
  }

  async get_global_components_dir(): Promise<string> {
    return WEB_GLOBAL_COMPONENTS_DIR;
  }

  async save_text_file(path: string, content: string): Promise<void> {
    localStorage.setItem(`file://${path}`, content);
  }

  async read_text_file(path: string): Promise<string> {
    const content = localStorage.getItem(`file://${path}`);
    if (content === null) throw new Error(`File not found: ${path}`);
    return content;
  }

  async list_json_files_in_dir(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    const prefix = `file://${dirPath}/`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix) && key.endsWith('.json')) {
        const content = localStorage.getItem(key);
        if (content) {
          files.push(content);
        }
      }
    }
    return files;
  }

  async delete_file(path: string): Promise<void> {
    localStorage.removeItem(`file://${path}`);
  }
}
