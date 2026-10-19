import { afterEach, beforeEach, expect, it } from 'vitest';
import { createStarterDiagram } from '../../features/onboarding/starterDiagram';
import { setDiagramDataInStore, useAppStore } from '../../store/useAppStore';
import { commitInlineTiming, timingValue } from './inlineTiming';

const initial = useAppStore.getInitialState();
const id = 'starter-step-1';
beforeEach(() => {
  useAppStore.setState(initial, true);
  const doc = createStarterDiagram('tr');
  setDiagramDataInStore(doc.logicalData, doc.visualData);
});
afterEach(() => useAppStore.setState(initial, true));
function commit(draft: string) {
  return commitInlineTiming(id, 'duration', draft, useAppStore.getState().logicalData, timingValue(id, 'duration'));
}
it('accepts Turkish and English decimals, preserves metadata, and undoes one field at a time', () => {
  const before = useAppStore.getState().visualData.timelines[id];
  expect(commit('1250,75')).toBe('saved');
  expect(useAppStore.getState().visualData.timelines[id]).toEqual({ ...before, duration: 1250.75 });
  expect(useAppStore.getState().pastStates).toHaveLength(1);
  expect(commitInlineTiming(id, 'delay', '12.5', useAppStore.getState().logicalData, timingValue(id, 'delay'))).toBe('saved');
  expect(useAppStore.getState().pastStates).toHaveLength(2);
  useAppStore.getState().undo();
  expect(timingValue(id, 'duration')).toBe(1250.75);
  expect(timingValue(id, 'delay')).toBe(before.delay);
  useAppStore.getState().undo();
  expect(useAppStore.getState().visualData.timelines[id]).toEqual(before);
  useAppStore.getState().redo();
  expect(timingValue(id, 'duration')).toBe(1250.75);
});
it.each(['', '-1', 'Infinity', 'NaN', '1,000.5', '0x10', '1.2.3', '1e999'])('rejects invalid draft %s without history', draft => {
  expect(commit(draft)).toBe('invalid');
  expect(useAppStore.getState().pastStates).toHaveLength(0);
});
it('accepts zero and does not create another undo point on Enter followed by blur', () => {
  expect(commit('0')).toBe('saved');
  expect(commit('0')).toBe('unchanged');
  expect(useAppStore.getState().pastStates).toHaveLength(1);
});
it('merges a concurrent edit to the other field without overwriting it', () => {
  const state = useAppStore.getState(), original = timingValue(id, 'duration');
  state.updateSequenceTiming(id, original, 42);
  expect(commitInlineTiming(id, 'duration', '1400', state.logicalData, original)).toBe('saved');
  expect(timingValue(id, 'delay')).toBe(42);
});
it('rejects a concurrent change to the same field and a document with reused IDs', () => {
  const state = useAppStore.getState(), original = timingValue(id, 'duration');
  state.updateSequenceTiming(id, 2000, 0);
  expect(commitInlineTiming(id, 'duration', '1400', state.logicalData, original)).toBe('stale');
  const doc = createStarterDiagram('en'); setDiagramDataInStore(doc.logicalData, doc.visualData);
  expect(commitInlineTiming(id, 'duration', '1400', state.logicalData, timingValue(id, 'duration'))).toBe('stale');
  expect(useAppStore.getState().pastStates).toHaveLength(0);
});
it.each([{ isPlaying: true }, { isReadOnly: true }])('blocks restricted edits: %s', restriction => {
  useAppStore.setState(restriction);
  expect(commit('1400')).toBe('blocked');
  expect(useAppStore.getState().pastStates).toHaveLength(0);
});

it('preserves tiny finite values represented in scientific notation', () => {
  expect(commit('1e-7')).toBe('saved');
  expect(commit('1e-7')).toBe('unchanged');
  expect(timingValue(id, 'duration')).toBe(1e-7);
});
