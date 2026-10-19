import { useAppStore, setDiagramDataInStore } from '../store/useAppStore';
import { compileTopology, generateTopology, unsupportedTopology } from './topology';

export function saveDslDraft(source: string) {
  const state = useAppStore.getState();
  if (state.isReadOnly || state.isCollabActive) return;
  const dsl = state.logicalData.dsl ?? generateTopology(state.logicalData, state.visualData);
  useAppStore.setState({logicalData: {...state.logicalData, dsl: {...dsl, draft: source, draftBase: dsl.draftBase ?? dsl.source}}, isDirty: true});
}
export function discardDslDraft() {
  const state = useAppStore.getState();
  if (!state.logicalData.dsl || state.isReadOnly || state.isCollabActive) return;
  const {draft: _draft, draftBase: _base, ...dsl} = state.logicalData.dsl;
  useAppStore.setState({logicalData: {...state.logicalData, dsl}, isDirty: true});
}
/** Validate against current state again at commit time, including after confirmation. */
export function applyDslSource(source: string, allowDeletion = false) {
  const state = useAppStore.getState();
  if (state.isReadOnly || state.isCollabActive || unsupportedTopology(state.logicalData, state.visualData)) throw new Error('Code editing is unavailable for this document.');
  if (state.logicalData.dsl?.draftBase !== undefined && state.logicalData.dsl.draftBase !== state.logicalData.dsl.source) throw new Error('The document changed while you were editing. Restore the current code before continuing.');
  if (source === state.logicalData.dsl?.source) { discardDslDraft(); return 0; }
  const result = compileTopology(source, state.logicalData, state.visualData);
  if (result.deleted && !allowDeletion) return result.deleted;
  const dsl = state.logicalData.dsl;
  const previous = dsl ? {...state.logicalData, dsl: {...dsl, draft: undefined, draftBase: undefined}} : state.logicalData;
  state.pushStateToHistory(previous, state.visualData);
  state.stopPlayback();
  setDiagramDataInStore(result.logicalData, result.visualData);
  useAppStore.setState({autoLayoutVersion: useAppStore.getState().autoLayoutVersion + (result.topologyChanged ? 1 : 0), isDirty: true, activeNodeProperties: null, activeEdgeProperties: null, selectedSequenceId: null, layoutVersion: useAppStore.getState().layoutVersion + 1});
  return 0;
}
