import { useAppStore } from '../../store/useAppStore';
import { StorageService } from '../storage';
import { getPlatformCapabilities } from '../platformCapabilities';
import { ensureSavedForNavigation } from '../saveCoordinator';
import { type AppRoute, decodeRoute, encodeRoute, hostOwnsNavigation, sameRoute, workspaceRouteId } from './routes';

export interface HistoryPort {
  url(): string;
  state(): unknown;
  push(state: unknown, url: string): void;
  replace(state: unknown, url: string): void;
  go(delta: number): void;
  listen(callback: () => void): () => void;
}
interface NavigationEntry { version: 1; index: number; route: AppRoute }
function readEntry(state: unknown): NavigationEntry | null {
  const entry = (state as { yadaNavigation?: NavigationEntry } | null)?.yadaNavigation;
  return entry?.version === 1 && Number.isSafeInteger(entry.index) && entry.route && decodeRoute(encodeRoute(entry.route)) ? entry : null;
}
function routeFromState(): AppRoute | null {
  const state = useAppStore.getState();
  if (state.isCollabActive || state.isReadOnly || state.viewMode === 'import-preview' || state.currentWorkspace?.path.startsWith('memory://')) return null;
  if (!state.currentWorkspace) return { kind: 'home' };
  const workspace = workspaceRouteId(state.currentWorkspace);
  return state.activeDiagramId ? { kind: 'diagram', workspace, diagram: state.activeDiagramId, view: state.viewMode === 'sequence' ? 'sequence' : 'freeform' } : { kind: 'workspace', workspace };
}
function protectedLink(url: URL) { return /(?:^|[?#&])(share|ref|collab)=/.test(`${url.search}${url.hash}`); }

export function browserHistoryPort(): HistoryPort {
  return {
    url: () => window.location.href, state: () => window.history.state,
    push: (state, url) => window.history.pushState(state, '', url),
    replace: (state, url) => window.history.replaceState(state, '', url),
    go: delta => window.history.go(delta),
    listen: callback => { window.addEventListener('popstate', callback); return () => window.removeEventListener('popstate', callback); },
  };
}

/** A small React-compatible history controller; no server deep-link fallback is needed. */
export function startBrowserNavigation(port: HistoryPort) {
  const initialUrl = new URL(port.url());
  if (!getPlatformCapabilities().canCreateDiagram || hostOwnsNavigation(initialUrl.search)) return { ready: Promise.resolve(), dispose: () => {} };
  let disposed = false, restoring = false, revertingTo: number | null = null;
  let current: NavigationEntry = { version: 1, index: readEntry(port.state())?.index ?? 0, route: routeFromState() ?? { kind: 'home' } };
  let chain = Promise.resolve();
  const write = (entry: NavigationEntry, replace = false) => {
    const url = new URL(port.url()); url.hash = encodeRoute(entry.route);
    const oldState = port.state();
    const state = { ...(oldState && typeof oldState === 'object' ? oldState : {}), yadaNavigation: entry };
    if (replace) port.replace(state, `${url.pathname}${url.search}${url.hash}`);
    else port.push(state, `${url.pathname}${url.search}${url.hash}`);
  };

  const apply = async (route: AppRoute) => {
    let state = useAppStore.getState();
    const sameWorkspace = state.currentWorkspace && route.kind !== 'home' && workspaceRouteId(state.currentWorkspace) === route.workspace;
    if (route.kind === 'diagram' && sameWorkspace && state.activeDiagramId === route.diagram) {
      useAppStore.setState({ viewMode: route.view, currentView: 'diagram' }); return;
    }
    if (state.isCollabActive) throw new Error('COLLAB_NAVIGATION_LOCKED');
    if (!await ensureSavedForNavigation()) throw new Error('CHANGES_NOT_SAVED');
    if (disposed) return;
    state = useAppStore.getState();
    if (route.kind === 'home') {
      if (!await state.setWorkspace(null)) throw new Error('CHANGES_NOT_SAVED');
      state.stopPlayback();
      useAppStore.setState({ activeDiagramId: null, openDiagramIds: [], viewMode: 'freeform', currentView: 'diagram' }); return;
    }
    if (!sameWorkspace) {
      const workspaces = JSON.parse(await StorageService.get_recent_workspaces());
      const workspace = Array.isArray(workspaces) ? workspaces.find(ws => typeof ws?.path === 'string' && workspaceRouteId(ws) === route.workspace) : undefined;
      if (!workspace) throw new Error('WORKSPACE_UNAVAILABLE');
      if (disposed) return;
      await useAppStore.getState().loadWorkspace(workspace.path);
    }
    if (disposed) return;
    state = useAppStore.getState();
    if (route.kind === 'diagram') {
      if (!state.diagrams.some(diagram => diagram.id === route.diagram)) throw new Error('DIAGRAM_UNAVAILABLE');
      await state.switchDiagram(route.diagram);
      if (useAppStore.getState().activeDiagramId !== route.diagram) throw new Error('DIAGRAM_UNAVAILABLE');
      useAppStore.setState({ viewMode: route.view, currentView: 'diagram' });
    } else {
      state.stopPlayback();
      useAppStore.setState({ activeDiagramId: null, openDiagramIds: [], viewMode: 'freeform', currentView: 'diagram', timelineOpen: false });
    }
  };

  const restore = (entry: NavigationEntry, initial = false) => {
    chain = chain.then(async () => {
      if (disposed) return;
      restoring = true;
      useAppStore.setState({ navigationPending: true, navigationError: null });
      let rollback = useAppStore.getState();
      try {
        // Capture the saved revision for rollback; never restore a false dirty flag on failure.
        const targetSameDocument = entry.route.kind === 'diagram' && rollback.currentWorkspace && workspaceRouteId(rollback.currentWorkspace) === entry.route.workspace && rollback.activeDiagramId === entry.route.diagram;
        if (!targetSameDocument && !await ensureSavedForNavigation()) { rollback = useAppStore.getState(); throw new Error('CHANGES_NOT_SAVED'); }
        rollback = useAppStore.getState();
        if (disposed) return;
        await apply(entry.route);
        if (disposed) return;
        current = entry;
        // A later pop may already have moved the browser while this load awaited I/O.
        if (initial || readEntry(port.state())?.index === entry.index) write(current, true);
      } catch (error) {
        if (disposed) return;
        const saveError = useAppStore.getState().saveError;
        useAppStore.setState({ ...rollback, saveError, navigationError: error instanceof Error ? error.message : String(error) });
        const actual = readEntry(port.state());
        if (!initial && actual && actual.index !== current.index) { revertingTo = current.index; port.go(current.index - actual.index); }
        else write(current, true);
      } finally {
        restoring = false;
        if (!disposed) useAppStore.setState({ navigationPending: false });
      }
    });
    return chain;
  };

  const initialRoute = decodeRoute(initialUrl.hash);
  if (initialRoute) void restore({ ...current, route: initialRoute }, true);
  else if (!protectedLink(initialUrl)) write(current, true);
  const unsubscribe = useAppStore.subscribe((state, previous) => {
    if (disposed || restoring || revertingTo !== null) return;
    if (state.currentWorkspace?.path === previous.currentWorkspace?.path && state.activeDiagramId === previous.activeDiagramId && state.viewMode === previous.viewMode && state.isReadOnly === previous.isReadOnly && state.isCollabActive === previous.isCollabActive) return;
    const route = routeFromState();
    if (!route) return;
    const url = new URL(port.url());
    if (protectedLink(url) && !previous.currentWorkspace?.path.startsWith('memory://')) return;
    if (sameRoute(route, current.route)) return;
    current = { version: 1, index: current.index + 1, route };
    write(current);
  });
  const unlisten = port.listen(() => {
    const entry = readEntry(port.state());
    const route = decodeRoute(new URL(port.url()).hash);
    if (!entry || !route) return;
    if (revertingTo === entry.index) { revertingTo = null; return; }
    void restore({ ...entry, route });
  });
  return { get ready() { return chain; }, dispose: () => { disposed = true; unsubscribe(); unlisten(); useAppStore.setState({ navigationPending: false }); } };
}
