import { buildSequenceLayout } from './useSequenceLayout';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSequencePlayback, messageParticle, messagePhase, participantActivityKey, subscribeMessageParticle } from './sequencePlayback';
import { computeSlots, computeParticipantOrder, computeFragmentBounds } from './sequenceLayoutUtils';
import { calculateSchedules } from '../../store/scheduler';
import { simulationClock } from '../../store/simulationClock';
import { migrateToSchemaV2 } from '../../utils/schemaMigration';
import { generateSequenceHtml } from '../../utils/exportSequenceTemplate';
import type { LogicalDiagram, VisualDiagram } from '../../types';

const logical: LogicalDiagram = {
  schemaVersion: 2,
  nodes: [
    { id: 'group', type: 'section', name: 'Application' },
    { id: 'client', type: 'client', name: 'Existing client' },
    { id: 'api', type: 'server', name: 'API', parentId: 'group' },
    { id: 'db', type: 'database', name: 'DB', parentId: 'group' },
  ],
  edges: [
    { id: 'request', sourceId: 'client', targetId: 'api', isAsync: false, description: 'Request' },
    { id: 'query', sourceId: 'api', targetId: 'db', isAsync: false, description: 'Query' },
  ],
  sequences: [
    { id: 'call', edgeId: 'request', stepNumber: 1, isAsync: false, isRoundTrip: true },
    { id: 'read', edgeId: 'query', stepNumber: 2, isAsync: false, isRoundTrip: true },
  ],
};
const visual: VisualDiagram = {
  canvas: { zoom: 1, pan: { x: 0, y: 0 } }, layoutNodes: {}, layoutEdges: {},
  timelines: {
    call: { sequenceId: 'call', duration: 1000, delay: 100, internalProcess: { text: 'Work', duration: 200 } },
    read: { sequenceId: 'read', duration: 600, delay: 50 },
  },
};

beforeEach(() => simulationClock.reset());

describe('existing sequence fixtures', () => {
  it.each([undefined, 1, 2])('preserves nested round trips from schema %s and matches HTML layout', version => {
    // Unversioned documents are a supported legacy runtime input.
    const input = { ...structuredClone(logical), schemaVersion: version } as LogicalDiagram;
    const original = JSON.stringify({ input, visual });
    const migrated = migrateToSchemaV2(input, visual);
    const schedules = calculateSchedules(migrated.logicalData.sequences, migrated.visualData.timelines, input.edges, input.nodes);
    expect(schedules).toEqual({ call: { start: 100, end: 1950 }, read: { start: 850, end: 1450 } });
    const model = buildSequencePlayback(input.sequences, input.edges, schedules);
    expect(Object.fromEntries(model.fwdSlotMap)).toEqual({ call: 0, read: 1 });
    expect(Object.fromEntries(model.retSlotMap)).toEqual({ read: 2, call: 3 });
    expect(model.slotsByParticipant.get('client')).toEqual([0, 3]);
    expect(model.slotsByParticipant.get('db')).toEqual([1, 2]);
    const participants = input.nodes.filter(n => n.type !== 'section');
    const order = computeParticipantOrder(participants, input.edges);
    const bounds = computeFragmentBounds(input.nodes.filter(n => n.type === 'section'), participants, order, new Map(input.edges.map(e => [e.id, e])), input.sequences, model.fwdSlotMap, model.retSlotMap);
    expect(bounds[0]).toMatchObject({ minSlot: 0, maxSlot: 3 });
    const rendered = buildSequenceLayout(migrated.logicalData, schedules);
    expect(rendered.rfEdges.map(edge => [edge.id, edge.source, edge.target, edge.data?.description])).toEqual([
      ['seq-fwd-call', 'seq-p-client', 'seq-p-api', 'Request'],
      ['seq-ret-call', 'seq-p-api', 'seq-p-client', undefined],
      ['seq-fwd-read', 'seq-p-api', 'seq-p-db', 'Query'],
      ['seq-ret-read', 'seq-p-db', 'seq-p-api', undefined],
    ]);
    for (const edge of rendered.rfEdges) {
      for (const [nodeId, handle] of [[edge.source, edge.sourceHandle], [edge.target, edge.targetHandle]]) {
        const node = rendered.rfNodes.find(node => node.id === nodeId)!;
        const slot = Number(handle!.split('-')[1]);
        expect(node.data.messageSlots).toContain(slot);
      }
    }
    const html = generateSequenceHtml(migrated.logicalData, schedules, visual.timelines, 'light');
    const exportedLayout = JSON.parse(html.match(/const layout = (.*);/)![1]);
    expect(exportedLayout.fwdSlotObj).toEqual(Object.fromEntries(model.fwdSlotMap));
    expect(exportedLayout.retSlotObj).toEqual(Object.fromEntries(model.retSlotMap));
    expect(exportedLayout.orderObj).toEqual(Object.fromEntries(order));
    expect(exportedLayout.fragmentBounds).toEqual(bounds);
    expect(JSON.stringify({ input, visual })).toBe(original);
  });

  it('orders concurrent forwards stably and coincident returns before forwards', () => {
    const sequences = [
      { id: 'a', edgeId: 'request', stepNumber: 1, isAsync: false, isRoundTrip: true },
      { id: 'b', edgeId: 'query', stepNumber: 1, isAsync: true, isRoundTrip: true },
      { id: 'c', edgeId: 'query', stepNumber: 2, isAsync: false },
    ];
    const slots = computeSlots(sequences, { a: { start: 0, end: 100 }, b: { start: 0, end: 100 }, c: { start: 100, end: 200 } });
    expect(Object.fromEntries(slots.fwdSlotMap)).toEqual({ a: 0, b: 1, c: 4 });
    expect(Object.fromEntries(slots.retSlotMap)).toEqual({ a: 2, b: 3 });
  });

  it('handles missing schedules, missing edges, empty graphs and self calls', () => {
    expect(buildSequencePlayback([], [], {}).totalSlots).toBe(0);
    const seq = [{ id: 'self', edgeId: 'self-edge', stepNumber: 1, isAsync: false }];
    const edges = [{ id: 'self-edge', sourceId: 'api', targetId: 'api', isAsync: false }];
    const model = buildSequencePlayback(seq, edges, { self: { start: 0, end: 100 } });
    expect(model.activityByParticipant.get('api')).toHaveLength(1);
    expect(model.slotsByParticipant.get('api')).toEqual([0]);
    expect(buildSequencePlayback(seq, [], {}).activityByParticipant.size).toBe(0);
    expect(buildSequencePlayback(seq, edges, {}).activityByParticipant.size).toBe(0);
  });

  it('keeps inclusive activity boundaries and combines nested intervals without global lookups', () => {
    const schedules = calculateSchedules(logical.sequences, visual.timelines, logical.edges, logical.nodes);
    const model = buildSequencePlayback(logical.sequences, logical.edges, schedules);
    const api = model.activityByParticipant.get('api')!;
    expect(participantActivityKey(api, 99)).toBe('');
    expect(participantActivityKey(api, 100)).toBe('0:3');
    expect(participantActivityKey(api, 1000)).toBe('0:3');
    expect(participantActivityKey(api, 1950)).toBe('0:3');
    expect(participantActivityKey(api, 1951)).toBe('');
    expect(participantActivityKey(model.activityByParticipant.get('db')!, 1000)).toBe('1:2');
  });
});

describe('clock driven message playback', () => {
  const schedule = { start: 100, end: 1900 };
  it.each([
    [99, 'idle'], [100, 'forward'], [599, 'forward'], [600, 'waiting'],
    [1399, 'waiting'], [1400, 'return'], [1900, 'return'], [1901, 'idle'],
  ] as const)('preserves round-trip phase at %s ms', (time, phase) => {
    expect(messagePhase(time, schedule, 500, true)).toBe(phase);
  });

  it('preserves legacy one-way travel and zero-duration boundaries', () => {
    expect(messagePhase(600, schedule, 500, false)).toBe('waiting');
    expect(messagePhase(0, { start: 0, end: 0 }, 0, true)).toBe('forward');
    expect(messagePhase(0, undefined, 0, false)).toBe('idle');
    expect(messageParticle(0, { start: 0, end: 0 }, 0, true)).toBe(1);
    expect(messageParticle(0, { start: 0, end: 0 }, 0, false)).toBeNull();
  });

  it('skips unchanged hidden particles but delivers seeks and phase transitions', () => {
    const update = vi.fn();
    const unsubscribe = subscribeMessageParticle({ start: 100, end: 1000 }, 200, false, update);
    expect(update).toHaveBeenCalledExactlyOnceWith(null);
    for (let time = 1; time < 100; time++) simulationClock.setTime(time);
    expect(update).toHaveBeenCalledTimes(1);
    simulationClock.setTime(150);
    expect(update).toHaveBeenLastCalledWith(0.25);
    simulationClock.setTime(350);
    expect(update).toHaveBeenLastCalledWith(null);
    const calls = update.mock.calls.length;
    simulationClock.setTime(500);
    simulationClock.setTime(1001);
    expect(update).toHaveBeenCalledTimes(calls);
    simulationClock.setTime(150);
    expect(update).toHaveBeenLastCalledWith(0.25);
    unsubscribe();
  });

  it('delivers frame positions immediately, supports seek/pause/reset and unsubscribes', () => {
    simulationClock.setTime(200);
    const update = vi.fn();
    const unsubscribe = subscribeMessageParticle(schedule, 500, false, update);
    expect(update).toHaveBeenLastCalledWith(0.2);
    simulationClock.setIsPlaying(true);
    simulationClock.setTime(216);
    expect(update).toHaveBeenLastCalledWith(0.232);
    simulationClock.setIsPlaying(false);
    expect(update).toHaveBeenLastCalledWith(0.232);
    simulationClock.setTime(350); // Seek while paused.
    expect(update).toHaveBeenLastCalledWith(0.5);
    simulationClock.reset();
    expect(update).toHaveBeenLastCalledWith(null);
    unsubscribe();
    update.mockClear();
    simulationClock.setTime(400);
    expect(update).not.toHaveBeenCalled();
  });

  it('animates return direction and hides particles outside their phase', () => {
    expect(messageParticle(350, schedule, 500, false)).toBe(0.5);
    expect(messageParticle(600, schedule, 500, false)).toBeNull();
    expect(messageParticle(1399, schedule, 500, true)).toBeNull();
    expect(messageParticle(1650, schedule, 500, true)).toBe(0.5);
    expect(messageParticle(1900, schedule, 500, true)).toBe(1);
    expect(messageParticle(1901, schedule, 500, true)).toBeNull();
  });
});
