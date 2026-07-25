import { isTauri } from './storage';

export const isForge = (): boolean => {
  if (isTauri()) {
    return false;
  }
  return (
    (typeof window !== 'undefined' && (window as any).__FORGE_BRIDGE__ !== undefined) ||
    import.meta.env.VITE_TARGET === 'forge'
  );
};

export const safeGetForgeContext = async (): Promise<any> => {
  if (!isForge()) return null;
  try {
    const { view } = await import('@forge/bridge');
    return await view.getContext();
  } catch (err) {
    console.warn('Forge view.getContext not available:', err);
    return null;
  }
};

export const safeSetForgeHeight = async (height: number): Promise<void> => {
  if (!isForge()) return;
  try {
    const { view } = await import('@forge/bridge');
    await (view as any).setHeight(height);
  } catch (err) {
    console.warn('Forge view.setHeight not available:', err);
  }
};

export const openForgeEditorModal = async (localId: string, onCloseCallback?: () => void): Promise<void> => {
  if (!isForge()) return;
  try {
    const { Modal } = await import('@forge/bridge');
    const modal = new Modal({
      resource: 'main',
      size: 'max',
      context: { macroLocalId: localId },
      onClose: () => {
        if (onCloseCallback) onCloseCallback();
      }
    });
    await modal.open();
  } catch (err) {
    console.warn('Forge Modal.open error:', err);
  }
};

export const closeForgeModal = async (payload?: any): Promise<void> => {
  if (!isForge()) return;
  try {
    const { view } = await import('@forge/bridge');
    await view.close(payload);
  } catch (err) {
    console.warn('Forge view.close error:', err);
  }
};
