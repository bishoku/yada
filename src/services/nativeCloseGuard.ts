interface CloseHost {
  onCloseRequested(handler: (event: { preventDefault(): void }) => void | Promise<void>): Promise<() => void>;
  close(): Promise<void>;
}

interface CloseState { isDirty: boolean; isSaving: boolean; isReadOnly: boolean; viewMode: string }

/** Never close over an unacknowledged save or edits made during the save. */
export async function registerNativeCloseGuard(host: CloseHost, getState: () => CloseState, save: () => Promise<boolean>, onError: (error: unknown) => void) {
  let pending = false;
  let disposed = false;
  const unlisten = await host.onCloseRequested(async event => {
    const state = getState();
    const needsSave = !state.isReadOnly && state.viewMode !== 'import-preview' && (state.isDirty || state.isSaving);
    if (!needsSave && !pending) return;
    event.preventDefault();
    if (pending) return;
    pending = true;
    try {
      const saved = await save();
      pending = false;
      const latest = getState();
      if (!disposed && saved && !latest.isDirty && !latest.isSaving) await host.close();
    } catch (error) {
      onError(error);
    } finally {
      pending = false;
    }
  });
  return () => { disposed = true; unlisten(); };
}
