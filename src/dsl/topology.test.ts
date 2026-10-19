import { describe, it, expect } from 'vitest';
import { compileTopology, generateTopology, parseTopology, syncTopology, unsupportedTopology } from './topology';
import type { LogicalDiagram, VisualDiagram } from '../types';
import { calculateSchedules } from '../store/scheduler';
import { playbackEnd } from '../store/playbackModel';
const empty: LogicalDiagram = {schemaVersion: 2, nodes: [], edges: [], sequences: []};
const visual: VisualDiagram = {canvas: {zoom: 1, pan: {x: 0, y: 0}}, layoutNodes: {}, layoutEdges: {}, timelines: {}, annotations: {}};
const source = `yada 1
%% Architecture
client web "Web App"
group backend "Backend" {
  service api "API" %% Keep this comment
  database db "Database"
}
web --> api : "Request" @request [step=1, duration=800ms]
api --> db : "Query" @query [step=2, roundtrip, duration=1.2s]
api ~> web : "Events" @events [step=3, repeat=3, duration=500ms]
`;
const fixture = () => compileTopology(source, empty, visual);

describe('YADA topology DSL', () => {
  it('maps repeat to the existing continuous particle mode without creating repeated steps', () => {
    const result = fixture();
    expect(result.logicalData.sequences).toHaveLength(3);
    const step = result.logicalData.sequences[2];
    expect(result.visualData.timelines[step.id]).toMatchObject({animationMode: 'repeat', repeatParticleCount: 3, duration: 500});
    const schedules = calculateSchedules(result.logicalData.sequences, result.visualData.timelines, result.logicalData.edges, result.logicalData.nodes);
    const end = playbackEnd(result.logicalData.sequences, result.visualData.timelines, schedules);
    const differentCount = compileTopology(source.replace('repeat=3', 'repeat=9'), result.logicalData, result.visualData);
    const otherSchedules = calculateSchedules(differentCount.logicalData.sequences, differentCount.visualData.timelines, differentCount.logicalData.edges, differentCount.logicalData.nodes);
    expect(playbackEnd(differentCount.logicalData.sequences, differentCount.visualData.timelines, otherSchedules)).toBe(end);
  });
  it('preserves IDs, positions, styles, hidden timing fields and annotations on code edits', () => {
    const first = fixture();
    const apiId = first.logicalData.dsl!.nodeIds.api;
    first.visualData.layoutNodes[apiId] = {...first.visualData.layoutNodes[apiId], x: 123, y: 456, theme: 'red'};
    first.visualData.layoutNodes.note = {id: 'note', x: 3, y: 4};
    const timing = first.visualData.timelines[first.logicalData.sequences[0].id];
    timing.delay = 75; timing.internalProcess = {text: 'Work', duration: 300};
    const result = compileTopology(source.replace('"API"', '"Orders"'), first.logicalData, first.visualData);
    expect(result.logicalData.dsl!.nodeIds.api).toBe(apiId);
    expect(result.visualData.layoutNodes[apiId]).toEqual(first.visualData.layoutNodes[apiId]);
    expect(result.visualData.layoutNodes.note).toEqual({id: 'note', x: 3, y: 4});
    expect(result.visualData.timelines[timing.sequenceId]).toMatchObject({delay: 75, internalProcess: timing.internalProcess});
    expect(result.logicalData.sequences.map(s => s.id)).toEqual(first.logicalData.sequences.map(s => s.id));
  });
  it('uses implicit source order, explicit parallel groups and excludes unnumbered connections', () => {
    const simple = 'yada 1\nservice a "A"\nservice b "B"\na --> b @first\nb --> a @second\n';
    expect(compileTopology(simple, empty, visual).logicalData.sequences.map(s => s.stepNumber)).toEqual([1, 2]);
    const explicit = compileTopology(simple.replace('@first', '@first [step=10]'), empty, visual);
    expect(explicit.logicalData.sequences).toHaveLength(1);
    expect(explicit.logicalData.edges).toHaveLength(2);
    expect(compileTopology(simple.replace('@first', '@first [step=10]').replace('@second', '@second [step=10]'), empty, visual).logicalData.sequences.map(s => s.stepNumber)).toEqual([10, 10]);
  });
  it.each([
    'service a "A"\nservice a "B"',
    'service a "A"\na --> missing @call',
    'service a "A"\na ~> a @call [roundtrip]',
    'service a "A"\na --> a @call [repeat=3, roundtrip]',
    'service a "A"\na --> a @call [duration=0ms]',
    'service a "A"\na --> a @call [duration=800]',
    'service a "A"\na --> a @call [repeat=11]',
    'service a "A"\na --> a @call [unknown=3]',
    'service a "A"\na --> a @call [step=1, step=2]',
    'group g "Group" {',
    'service __proto__ "Unsafe"',
    'service a "A"\na --> a @call [step=1,]',
  ])('rejects invalid input atomically: %s', body => {
    expect(() => compileTopology(`yada 1\n${body}`, empty, visual)).toThrow();
    expect(empty.nodes).toEqual([]);
  });
  it('preserves quoted punctuation and escaped labels', () => {
    const text = 'yada 1\nservice a "Türkçe \\"test\\" %% label"\n';
    expect(parseTopology(text).nodes[0].name).toBe('Türkçe "test" %% label');
  });
  it('patches just changed label tokens, preserving comments and duration spelling', () => {
    const first = fixture();
    const logical = {...first.logicalData, nodes: first.logicalData.nodes.map(n => n.name === 'API' ? {...n, name: 'Orders'} : n)};
    const synced = syncTopology(logical, first.visualData, first.logicalData, first.visualData);
    expect(synced.source).toBe(source.replace('"API"', '"Orders"'));
  });
  it('keeps comments when moving a component between groups', () => {
    const first = fixture();
    const logical = {...first.logicalData, nodes: first.logicalData.nodes.map(n => n.name === 'API' ? {...n, parentId: undefined} : n)};
    const synced = syncTopology(logical, first.visualData, first.logicalData, first.visualData);
    expect(synced.source).toContain('%% Architecture');
    expect(synced.source).toContain('%% Keep this comment');
    expect(parseTopology(synced.source).nodes.find(n => n.id === 'api')?.parentId).toBeUndefined();
  });
  it('preserves child coordinates and nested groups across save/reopen', () => {
    const first = compileTopology('yada 1\ngroup outer "Outer" {\ngroup inner "Inner" {\nservice a "A"\n}\n}\n', empty, visual);
    const saved = JSON.parse(JSON.stringify(first));
    const next = compileTopology(saved.logicalData.dsl.source, saved.logicalData, saved.visualData);
    expect(next.visualData.layoutNodes).toEqual(first.visualData.layoutNodes);
    expect(next.logicalData).toEqual(first.logicalData);
  });
  it('keeps legacy data intact on export and flags multiple steps instead of flattening', () => {
    const first = fixture();
    delete first.logicalData.dsl;
    const original = JSON.stringify(first);
    expect(generateTopology(first.logicalData, first.visualData).source).toContain('repeat=3');
    expect(JSON.stringify(first)).toBe(original);
    first.logicalData.sequences.push({...first.logicalData.sequences[0], id: 'another'});
    expect(unsupportedTopology(first.logicalData, first.visualData)).toContain('Multiple steps');
  });
  it('preserves duration when its optional DSL field is removed', () => {
    const first = fixture();
    const result = compileTopology(source.replace(', duration=1.2s', ''), first.logicalData, first.visualData);
    expect(result.visualData.timelines[first.logicalData.sequences[1].id].duration).toBe(1200);
  });
});

it('reserves existing aliases when a new canvas node is inserted before them', () => {
  const first = fixture();
  const alias = Object.keys(first.logicalData.dsl!.nodeIds)[0];
  const logical = {...first.logicalData, nodes: [{id: 'new', name: alias, type: 'service'}, ...first.logicalData.nodes]};
  const generated = generateTopology(logical, first.visualData);
  expect(generated.nodeIds[alias]).toBe(first.logicalData.dsl!.nodeIds[alias]);
  expect(generated.nodeIds[`${alias}_2`]).toBe('new');
});

it('keeps a reparented child enclosed after shared auto-layout', () => {
  const first = compileTopology('yada 1\ngroup g "Group" {\n}\nservice a "A"\n', empty, visual);
  const a = first.logicalData.dsl!.nodeIds.a, g = first.logicalData.dsl!.nodeIds.g;
  first.visualData.layoutNodes[a] = {...first.visualData.layoutNodes[a], x: 100, y: 150};
  first.visualData.layoutNodes[g] = {...first.visualData.layoutNodes[g], x: 500, y: 500};
  const moved = compileTopology('yada 1\ngroup g "Group" {\nservice a "A"\n}\n', first.logicalData, first.visualData);
  expect(moved.visualData.layoutNodes[a].x).toBeGreaterThanOrEqual(40);
  expect(moved.visualData.layoutNodes[a].y).toBeGreaterThanOrEqual(50);
  expect(moved.visualData.layoutNodes[g].width).toBeGreaterThan(moved.visualData.layoutNodes[a].x);
});

it('defaults structural code changes to LR and honors the saved TB preference', () => {
  const text = 'yada 1\nservice a "A"\nservice b "B"\na --> b @call\n';
  for (const direction of ['LR', 'TB'] as const) {
    const result = compileTopology(text, empty, {...visual, ...(direction === 'TB' ? {autoLayoutDirection: direction} : {})});
    const a = result.visualData.layoutNodes[result.logicalData.dsl!.nodeIds.a];
    const b = result.visualData.layoutNodes[result.logicalData.dsl!.nodeIds.b];
    expect(result.visualData.autoLayoutDirection).toBe(direction);
    expect(direction === 'LR' ? b.x > a.x : b.y > a.y).toBe(true);
    const renamed = compileTopology(text.replace('"A"', '"Renamed"'), result.logicalData, result.visualData);
    expect(renamed.topologyChanged).toBe(false);
    expect(renamed.visualData.layoutNodes).toEqual(result.visualData.layoutNodes);
  }
});
