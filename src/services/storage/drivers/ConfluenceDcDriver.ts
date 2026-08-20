import { IStorageDriver, StorageMode } from '../types';
import { LocalStorageDriver } from './LocalStorageDriver';
import { getConfluenceDcContext } from '../../confluenceDcBridge';
import { generatePngDataUrl } from '../../../utils/exportMedia';

export class ConfluenceDcDriver implements IStorageDriver {
  private fallbackDriver = new LocalStorageDriver();

  getMode(): StorageMode {
    return 'confluence-dc';
  }

  private getAuthHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      // Atlassian CSRF protection header
      'X-Atlassian-Token': 'no-check',
    };

    const win = typeof window !== 'undefined' ? (window as any) : {};
    if (win.AJS?.Meta?.get) {
      const atlToken = win.AJS.Meta.get('atl-token');
      if (atlToken) {
        headers['X-AJS-Atl-Token'] = atlToken;
      }
    }

    return headers;
  }

  async create_workspace(name: string, description: string): Promise<string> {
    const { pageId, macroId } = getConfluenceDcContext();
    const ws = {
      id: `${pageId}_${macroId}`,
      name: name || 'Confluence DC Diagram',
      description,
      path: `confluence-dc://${pageId}/${macroId}`,
      lastModified: new Date().toISOString()
    };
    return JSON.stringify(ws);
  }

  async load_workspace(path: string): Promise<string> {
    const { pageId, macroId } = getConfluenceDcContext();
    return JSON.stringify({
      id: `${pageId}_${macroId}`,
      name: 'Confluence DC Diagram',
      path,
      lastModified: new Date().toISOString()
    });
  }

  async save_workspace(_metaJson: string): Promise<void> {
    // Workspace metadata is tied to the Confluence page/macro attachment
  }

  async get_recent_workspaces(): Promise<string> {
    return '[]';
  }

  async delete_workspace(_path: string): Promise<void> {}

  async save_diagram(
    path: string, 
    diagramId: string = 'default', 
    logicalJson: string, 
    visualJson: string, 
    diagramFileJson?: string
  ): Promise<void> {
    const { pageId, macroId, restBaseUrl } = getConfluenceDcContext();

    let previewDataUri = '';
    try {
      previewDataUri = await generatePngDataUrl('.react-flow');
    } catch (e) {
      console.warn('[ConfluenceDcDriver] Failed to capture PNG preview:', e);
    }

    const payload = {
      pageId,
      macroId,
      diagramId,
      logicalJson,
      visualJson,
      diagramFileJson,
      previewDataUri,
      updatedAt: new Date().toISOString()
    };

    try {
      const endpoint = `${restBaseUrl}/diagram/${encodeURIComponent(pageId)}/${encodeURIComponent(diagramId)}?macroId=${encodeURIComponent(macroId)}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('[ConfluenceDcDriver] Diagram saved successfully to Confluence Attachment for Page:', pageId);
    } catch (err) {
      console.error('[ConfluenceDcDriver] Failed to save diagram to Confluence DC backend, falling back to LocalStorage:', err);
      return this.fallbackDriver.save_diagram(path, diagramId, logicalJson, visualJson, diagramFileJson);
    }
  }

  async load_diagram(path: string, diagramId: string = 'default'): Promise<string> {
    const { pageId, macroId, restBaseUrl } = getConfluenceDcContext();

    try {
      const endpoint = `${restBaseUrl}/diagram/${encodeURIComponent(pageId)}/${encodeURIComponent(diagramId)}?macroId=${encodeURIComponent(macroId)}`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          // New diagram on this page
          console.log('[ConfluenceDcDriver] Diagram not found on server, returning empty default structure');
          return JSON.stringify({
            logicalData: { schemaVersion: 2, nodes: [], edges: [], sequences: [] },
            visualData: { canvas: { zoom: 1, pan: { x: 0, y: 0 } }, layoutNodes: {}, layoutEdges: {}, timelines: {}, annotations: {} }
          });
        }
        throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return typeof data === 'string' ? data : JSON.stringify(data);
    } catch (err) {
      console.warn('[ConfluenceDcDriver] Failed to load from Confluence DC backend, trying fallback:', err);
      return this.fallbackDriver.load_diagram(path, diagramId);
    }
  }

  async save_preferences(preferencesJson: string): Promise<void> {
    return this.fallbackDriver.save_preferences(preferencesJson);
  }

  async load_preferences(): Promise<string> {
    return this.fallbackDriver.load_preferences();
  }

  async get_global_components_dir(): Promise<string> {
    return 'confluence-dc://global_components';
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
