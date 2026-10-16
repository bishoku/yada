import { useAppStore, setDiagramDataInStore } from '../../store/useAppStore';
import { createStarterDiagram, isDiagramEmpty } from './starterDiagram';

/** Never replace an authored diagram or bypass live-collaboration mutations. */
export function insertStarterDiagram(): boolean {
  const state = useAppStore.getState();
  if (!state.currentWorkspace || !state.activeDiagramId || state.currentWorkspace.path.startsWith('memory://') || state.isReadOnly || state.isCollabActive || state.isPlaying || !isDiagramEmpty(state.logicalData,state.visualData)) return false;
  const starter = createStarterDiagram(state.language);
  state.pushToHistory();
  setDiagramDataInStore(starter.logicalData, { ...starter.visualData, canvas: state.visualData.canvas });
  useAppStore.setState({ isDirty: true, layoutVersion: state.layoutVersion + 1, activeSequenceIds: [], selectedSequenceId: null, activeNodeProperties: null, activeEdgeProperties: null });
  return true;
}
