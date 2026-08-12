import { IStorageDriver, StorageMode } from '../types';
import { toPng } from 'html-to-image';

export class EmbedIframeDriver implements IStorageDriver {
  private initialData: { logicalData?: any; visualData?: any } | null = null;
  private resolveInitialData: ((data: any) => void) | null = null;
  private initialDataPromise: Promise<any>;

  constructor() {
    this.initialDataPromise = new Promise((resolve) => {
      this.resolveInitialData = resolve;
    });

    window.addEventListener('message', (event) => {
      // In a real app we might want to check event.origin, but for this embed we accept from anywhere
      if (event.data?.type === 'LOAD_DIAGRAM') {
        const payload = event.data.payload;
        if (payload) {
          const data = {
            logicalData: typeof payload.logicalJson === 'string' ? JSON.parse(payload.logicalJson) : payload.logicalJson,
            visualData: typeof payload.visualJson === 'string' ? JSON.parse(payload.visualJson) : payload.visualJson
          };
          this.initialData = data;
          if (this.resolveInitialData) {
            this.resolveInitialData(data);
          }
        }
      }
    });

    // Let the parent know we are ready to receive data
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'READY' }, '*');
    }
  }

  getMode(): StorageMode {
    return 'embed';
  }

  async create_workspace(name: string, description: string): Promise<string> {
    const id = Math.random().toString(36).substring(2, 9);
    const virtualPath = `embed://workspace/${id}`;
    return JSON.stringify({ name, description, path: virtualPath, lastModified: new Date().toISOString() });
  }

  async load_workspace(path: string): Promise<string> {
    return JSON.stringify({ name: 'Embedded Diagram', path, lastModified: new Date().toISOString() });
  }

  async save_workspace(_metaJson: string): Promise<void> {
    // No-op for embed
  }

  async get_recent_workspaces(): Promise<string> {
    return '[]';
  }

  async delete_workspace(_path: string): Promise<void> {}

  async save_diagram(_path: string, _diagramId: string, logicalJson: string, visualJson: string, _diagramFileJson?: string): Promise<void> {
    if (window.parent === window) return;

    let previewDataUri = '';
    try {
      const container = document.querySelector('.react-flow') as HTMLElement;
      if (container) {
        previewDataUri = await toPng(container, {
          backgroundColor: '#ffffff', // Or whatever default is
          filter: (node) => {
            // Optional: filter out UI elements if needed
            if (node.classList?.contains('react-flow__controls') || node.classList?.contains('react-flow__minimap') || node.classList?.contains('react-flow__panel')) {
              return false;
            }
            return true;
          }
        });
      }
    } catch (e) {
      console.warn('Failed to capture PNG for embed preview', e);
    }

    window.parent.postMessage({
      type: 'SAVE_DIAGRAM',
      payload: {
        logicalJson,
        visualJson,
        previewDataUri
      }
    }, '*');
  }

  async load_diagram(_path: string, _diagramId?: string): Promise<string> {
    // Wait for the LOAD_DIAGRAM message if we haven't received it yet
    if (!this.initialData) {
      // Add a timeout just in case it's a new diagram and parent doesn't send LOAD_DIAGRAM
      await Promise.race([
        this.initialDataPromise,
        new Promise(resolve => setTimeout(resolve, 500))
      ]);
    }
    
    if (this.initialData) {
      return JSON.stringify(this.initialData);
    }

    // Default empty diagram if parent didn't send anything
    return JSON.stringify({
      logicalData: { nodes: [], edges: [], components: {} },
      visualData: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
    });
  }

  async save_preferences(_preferencesJson: string): Promise<void> {}
  async load_preferences(): Promise<string> { return '{}'; }
  async get_global_components_dir(): Promise<string> { return ''; }
  async save_text_file(_path: string, _content: string): Promise<void> {}
  async read_text_file(_path: string): Promise<string> { return ''; }
  async list_json_files_in_dir(_dirPath: string): Promise<string[]> { return []; }
  async delete_file(_path: string): Promise<void> {}
}
