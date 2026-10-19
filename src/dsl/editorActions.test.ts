import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../store/useAppStore';
import { applyDslSource, discardDslDraft, saveDslDraft } from './editorActions';
import { compileTopology } from './topology';
import { migrateToSchemaV2 } from '../utils/schemaMigration';
const source = 'yada 1\nservice a "A"\nservice b "B"\na --> b : "Call" @call [step=1, repeat=3, duration=500ms]\n';
beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState(), true);
  useAppStore.setState({logicalData: {schemaVersion: 2, nodes: [], edges: [], sequences: []}, visualData: {canvas: {zoom: 1, pan: {x: 0, y: 0}}, layoutNodes: {}, layoutEdges: {}, timelines: {}}, isReadOnly: false, isCollabActive: false, pastStates: [], futureStates: []});
});
describe('topology editor document integration', () => {
  it('applies once with derived schedules and undoes/redoes code and model together', () => {
    saveDslDraft(source);
    applyDslSource(source);
    const state = useAppStore.getState();
    expect(state.logicalData.nodes).toHaveLength(2);
    expect(Object.keys(state.schedules)).toHaveLength(1);
    expect(state.pastStates).toHaveLength(1);
    expect(state.isDirty).toBe(true);
    state.undo();
    expect(useAppStore.getState().logicalData.nodes).toHaveLength(0);
    expect(useAppStore.getState().logicalData.dsl?.draft).toBeUndefined();
    useAppStore.getState().redo();
    expect(useAppStore.getState().logicalData.dsl?.source).toBe(source);
    expect(useAppStore.getState().logicalData.nodes).toHaveLength(2);
  });
  it('patches source after canvas and timeline edits, even while the panel is closed', () => {
    applyDslSource(source);
    const state = useAppStore.getState();
    const id = state.logicalData.nodes[0].id;
    state.updateNodeDetails(id, 'Renamed', 'service');
    expect(useAppStore.getState().logicalData.dsl?.source).toContain('service a "Renamed"');
    const step = useAppStore.getState().logicalData.sequences[0];
    useAppStore.getState().updateSequenceTiming(step.id, 750, 0);
    expect(useAppStore.getState().logicalData.dsl?.source).toContain('duration=750ms');
    useAppStore.getState().setSequenceStepAnimationMode(step.id, 'repeat', 5);
    expect(useAppStore.getState().logicalData.dsl?.source).toContain('repeat=5');
  });
  it('retains invalid drafts through serialization without altering the last valid model', () => {
    applyDslSource(source);
    const nodes = useAppStore.getState().logicalData.nodes;
    saveDslDraft('yada 1\nservice a "');
    expect(() => applyDslSource('yada 1\nservice a "')).toThrow();
    expect(useAppStore.getState().logicalData.nodes).toBe(nodes);
    const restored = JSON.parse(JSON.stringify(useAppStore.getState().logicalData));
    expect(restored.dsl.draft).toBe('yada 1\nservice a "');
    discardDslDraft();
    expect(useAppStore.getState().logicalData.dsl?.source).toBe(source);
    expect(useAppStore.getState().logicalData.dsl?.draft).toBeUndefined();
  });
  it('requires explicit application of destructive changes', () => {
    applyDslSource(source);
    saveDslDraft('yada 1\n');
    expect(applyDslSource('yada 1\n')).toBe(4);
    expect(useAppStore.getState().logicalData.nodes).toHaveLength(2);
    applyDslSource('yada 1\n', true);
    expect(useAppStore.getState().logicalData.nodes).toHaveLength(0);
  });
  it('does not overwrite model changes made after a draft began', () => {
    applyDslSource(source);
    saveDslDraft(source.replace('"A"', '"Draft"'));
    const state = useAppStore.getState();
    state.updateNodeDetails(state.logicalData.nodes[0].id, 'External edit', 'service');
    expect(() => applyDslSource(useAppStore.getState().logicalData.dsl!.draft!)).toThrow('document changed');
    expect(useAppStore.getState().logicalData.nodes[0].name).toBe('External edit');
  });
  it('keeps read-only and collaborative documents protected', () => {
    useAppStore.setState({isReadOnly: true});
    expect(() => applyDslSource(source)).toThrow();
    saveDslDraft(source);
    expect(useAppStore.getState().logicalData.dsl).toBeUndefined();
    useAppStore.setState({isReadOnly: false, isCollabActive: true});
    expect(() => applyDslSource(source)).toThrow();
  });
  it('keeps legacy repeat settings compatible after schema migration and code roundtrip', () => {
    const state = useAppStore.getState();
    const first = compileTopology(source, state.logicalData, state.visualData);
    const step = first.logicalData.sequences[0];
    const legacy = {...first.logicalData, schemaVersion: 1, dsl: undefined, sequences: [{...step, animationMode: 'repeat', repeatParticleCount: 3}]};
    const migrated = migrateToSchemaV2(legacy, first.visualData);
    const next = compileTopology(source, migrated.logicalData, migrated.visualData, first.logicalData.dsl);
    expect(next.visualData.timelines[step.id]).toMatchObject({animationMode: 'repeat', repeatParticleCount: 3, duration: 500});
    expect(next.logicalData.schemaVersion).toBe(2);
  });
});
