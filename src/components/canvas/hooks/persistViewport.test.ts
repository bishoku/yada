import { afterEach, expect, it } from 'vitest';
import { useAppStore } from '../../../store/useAppStore';
import { persistViewport } from './persistViewport';
const initial = useAppStore.getState();
afterEach(() => useAppStore.setState(initial, true));
const owner = { workspacePath: 'virtual://audit', diagramId: 'document-a' };
const viewport = { x: 12, y: 24, zoom: 0.75 };
function open() { useAppStore.setState({ currentWorkspace: {path: owner.workspacePath} as NonNullable<typeof initial.currentWorkspace>, activeDiagramId: owner.diagramId, isReadOnly: false, isDirty: false }); }
it('persists the current document viewport', () => {
  open(); expect(persistViewport(owner, viewport)).toBe(true);
  expect(useAppStore.getState().visualData.canvas).toMatchObject({ zoom: 0.75, pan: {x:12,y:24} });
});
it('does not dirty the home screen when a fit animation finishes late', () => {
  open(); useAppStore.setState({currentWorkspace:null, activeDiagramId:null});
  expect(persistViewport(owner, viewport)).toBe(false); expect(useAppStore.getState().isDirty).toBe(false);
});
it('does not overwrite another document or workspace viewport', () => {
  open(); useAppStore.setState({activeDiagramId:'document-b'});
  expect(persistViewport(owner, viewport)).toBe(false);
  useAppStore.setState({activeDiagramId:owner.diagramId,currentWorkspace:{path:'virtual://other'} as NonNullable<typeof initial.currentWorkspace>});
  expect(persistViewport(owner, viewport)).toBe(false); expect(useAppStore.getState().isDirty).toBe(false);
});
it('does not persist a read-only preview viewport', () => {
  open();useAppStore.setState({isReadOnly:true}); expect(persistViewport(owner,viewport)).toBe(false); expect(useAppStore.getState().isDirty).toBe(false);
});
