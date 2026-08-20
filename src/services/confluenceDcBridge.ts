import { isTauri } from './storage';

export interface ConfluenceDcContext {
  pageId: string;
  macroId: string;
  contextPath: string;
  isEditMode: boolean;
  canEdit: boolean;
  restBaseUrl: string;
}

/**
 * Checks if the current execution context is inside Confluence Server / Data Center.
 */
export const isConfluenceDC = (): boolean => {
  if (isTauri()) {
    return false;
  }
  
  if (typeof window === 'undefined') {
    return false;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const targetFromParam = searchParams.get('target');

  return (
    import.meta.env.VITE_TARGET === 'confluence-dc' ||
    targetFromParam === 'confluence-dc' ||
    (window as any).__CONFLUENCE_DC__ === true ||
    (typeof (window as any).AJS !== 'undefined' && typeof (window as any).__FORGE_BRIDGE__ === 'undefined' && !searchParams.get('mode')?.includes('tauri'))
  );
};

/**
 * Retrieves the current Confluence DC context including Page ID, Macro ID, and REST base URL.
 */
export const getConfluenceDcContext = (): ConfluenceDcContext => {
  if (typeof window === 'undefined') {
    return {
      pageId: '0',
      macroId: 'default',
      contextPath: '',
      isEditMode: false,
      canEdit: true,
      restBaseUrl: '/rest/yada/1.0',
    };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const win = window as any;

  // Context path (e.g. "/confluence" or "")
  const contextPath = (typeof win.AJS?.contextPath === 'function' ? win.AJS.contextPath() : '') || searchParams.get('cp') || '';

  // Page ID resolution
  const pageId = 
    searchParams.get('pageId') ||
    (typeof win.AJS?.Meta?.get === 'function' ? win.AJS.Meta.get('page-id') : null) ||
    win.AJS?.params?.pageId ||
    (typeof win.Confluence?.getContentId === 'function' ? win.Confluence.getContentId() : null) ||
    '0';

  // Macro ID resolution
  const macroId = 
    searchParams.get('macroId') || 
    searchParams.get('macroLocalId') || 
    'default';

  // Mode detection
  const isEditMode = 
    searchParams.get('mode') === 'edit' || 
    searchParams.get('embed_editor') === 'true' ||
    win.AJS?.Meta?.get('action-name') === 'editpage';

  return {
    pageId: String(pageId),
    macroId: String(macroId),
    contextPath,
    isEditMode,
    canEdit: true,
    restBaseUrl: `${contextPath}/rest/yada/1.0`,
  };
};

/**
 * Helper to close Confluence DC dialog or iframe modal
 */
export const closeConfluenceDcModal = (reload: boolean = true): void => {
  if (typeof window === 'undefined') return;

  const win = window as any;
  if (win.parent && win.parent !== win) {
    win.parent.postMessage({ type: 'CONFLUENCE_DC_CLOSE_MODAL', reload }, '*');
  }

  if (win.AJS?.dialog2) {
    const dialog = win.AJS.dialog2('#yada-editor-dialog');
    if (dialog && typeof dialog.hide === 'function') {
      dialog.hide();
    }
  }
};
