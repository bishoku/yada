import Resolver from '@forge/resolver';
import { storage } from '@forge/api';

const resolver = new Resolver();

// Save diagram data into Forge Storage for a page/macro
resolver.define('saveDiagram', async (req) => {
  const { path, diagramId, logicalJson, visualJson } = req.payload;
  const contextLocalId = req.context?.localId || req.context?.extension?.localId || req.context?.extension?.modal?.macroLocalId;
  const targetId = contextLocalId || path || 'default_macro';
  const storageKey = `yada_diag_${targetId}_${diagramId || 'default'}`;
  
  await storage.set(storageKey, {
    logicalJson,
    visualJson,
    updatedAt: new Date().toISOString()
  });

  return { success: true };
});

// Load diagram data from Forge Storage
resolver.define('loadDiagram', async (req) => {
  const { path, diagramId } = req.payload;
  const contextLocalId = req.context?.localId || req.context?.extension?.localId || req.context?.extension?.modal?.macroLocalId;
  const targetId = contextLocalId || path || 'default_macro';
  const storageKey = `yada_diag_${targetId}_${diagramId || 'default'}`;
  
  const data = await storage.get(storageKey);
  if (!data) {
    throw new Error('Diagram data not found');
  }

  return JSON.stringify({
    logicalData: typeof data.logicalJson === 'string' ? JSON.parse(data.logicalJson) : data.logicalJson,
    visualData: typeof data.visualJson === 'string' ? JSON.parse(data.visualJson) : data.visualJson
  });
});

// Workspace Resolvers
resolver.define('createWorkspace', async (req) => {
  const { name, description } = req.payload;
  const id = Math.random().toString(36).substring(2, 9);
  const virtualPath = `virtual://workspace/${id}`;
  const ws = {
    name,
    description,
    path: virtualPath,
    lastModified: new Date().toISOString()
  };
  await storage.set(`yada_ws_${virtualPath}`, ws);
  return ws;
});

resolver.define('loadWorkspace', async (req) => {
  const { path } = req.payload;
  const ws = await storage.get(`yada_ws_${path}`);
  if (!ws) {
    return { name: 'Confluence Diagram', path, lastModified: new Date().toISOString() };
  }
  return ws;
});

resolver.define('saveWorkspace', async (req) => {
  const { metaJson } = req.payload;
  const ws = typeof metaJson === 'string' ? JSON.parse(metaJson) : metaJson;
  await storage.set(`yada_ws_${ws.path}`, ws);
  return { success: true };
});

resolver.define('getRecentWorkspaces', async () => {
  return [];
});

// Preferences
resolver.define('savePreferences', async (req) => {
  const { preferencesJson } = req.payload;
  await storage.set('yada_user_preferences', preferencesJson);
  return { success: true };
});

resolver.define('loadPreferences', async () => {
  const prefs = await storage.get('yada_user_preferences');
  return prefs || '{}';
});

export const handler = resolver.getDefinitions();
