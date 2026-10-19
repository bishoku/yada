import { afterEach, beforeEach, expect, it } from 'vitest';
import { createStarterDiagram } from '../features/onboarding/starterDiagram';
import { setDiagramDataInStore, useAppStore } from './useAppStore';
const initial = useAppStore.getInitialState();
beforeEach(() => { useAppStore.setState(initial, true); const doc = createStarterDiagram('tr'); setDiagramDataInStore(doc.logicalData, doc.visualData); });
afterEach(() => useAppStore.setState(initial, true));
it('keeps simulation timing and internal work intact when quick-editing a protocol', () => {
  const state = useAppStore.getState(), timelines = state.visualData.timelines, schedules = state.schedules;
  state.pushToHistory(); state.updateEdgeDetails('starter-request', 'gRPC', false, 'Updated request');
  expect(useAppStore.getState().visualData.timelines).toEqual(timelines);
  expect(useAppStore.getState().schedules).toEqual(schedules);
  expect(useAppStore.getState().logicalData.edges[0].protocol).toBe('gRPC');
  useAppStore.getState().undo();
  expect(useAppStore.getState().logicalData.edges[0].protocol).toBe('HTTP');
  expect(useAppStore.getState().visualData.timelines).toEqual(timelines);
});
it('still permits explicitly clearing internal work and setting zero duration', () => {
  useAppStore.getState().updateEdgeDetails('starter-request', 'HTTP', false, '', undefined, undefined, 'Work', 0);
  expect(useAppStore.getState().visualData.timelines['starter-step-1'].internalProcess).toEqual({ text: 'Work', duration: 0 });
  useAppStore.getState().updateEdgeDetails('starter-request', 'HTTP', false, '', undefined, undefined, '');
  expect(useAppStore.getState().visualData.timelines['starter-step-1'].internalProcess).toBeUndefined();
});
