import { describe, expect, it } from 'vitest';
import type { Edge } from '@xyflow/react';
import { buildSequenceLayout } from './useSequenceLayout';
import { visibleSequenceEdges } from './sequenceVisibility';
import { calculateSchedules } from '../../store/scheduler';
import type { LogicalDiagram } from '../../types';

const logical: LogicalDiagram = {
  schemaVersion: 2,
  nodes: [{ id: 'a', type: 'client', name: 'A' }, { id: 'b', type: 'server', name: 'B' }],
  edges: [{ id: 'edge', sourceId: 'a', targetId: 'b', isAsync: false }],
  sequences: Array.from({ length: 1000 }, (_, i) => ({ id: `s${i}`, edgeId: 'edge', stepNumber: i + 1, isAsync: false, isRoundTrip: true })),
};
const timelines = Object.fromEntries(logical.sequences.map(seq => [seq.id, { sequenceId: seq.id, duration: 100, delay: 0 }]));
const schedules = calculateSchedules(logical.sequences, timelines, logical.edges, logical.nodes);
const layout = buildSequenceLayout(logical, schedules);

describe('sequence viewport rendering', () => {
  it('bounds mounted messages for large diagrams while retaining complete fit-view geometry', () => {
    const before = JSON.stringify(layout);
    const visible = visibleSequenceEdges(layout.rfEdges, { x: 0, y: 0, zoom: 1 }, 800);
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.length).toBeLessThan(20);
    expect(visible[0].id).toBe('seq-fwd-s0');
    expect(layout.rfEdges).toHaveLength(2000);
    expect(JSON.stringify(layout)).toBe(before);
  });
  it('supports panning, fractional zoom and reversed/return messages without altering handles', () => {
    const visible = visibleSequenceEdges(layout.rfEdges, { x: -500, y: -70000, zoom: 0.5 }, 800);
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.some(edge => edge.id.startsWith('seq-ret-'))).toBe(true);
    for (const edge of visible) {
      expect(layout.rfEdges.find(candidate => candidate.id === edge.id)).toBe(edge);
      expect(edge.sourceHandle).toContain('slot-');
      expect(edge.targetHandle).toContain('slot-');
    }
  });
  it('restores every message for capture regardless of viewport and preserves array identity', () => {
    expect(visibleSequenceEdges(layout.rfEdges, { x: 10, y: -20000, zoom: 2 }, 100, true)).toBe(layout.rfEdges);
  });
  it('keeps labels within screen overscan and includes exact boundaries', () => {
    const edge = { id: 'row', source: 'a', target: 'b', data: { slotIndex: 0 } } as Edge;
    // Slot zero is at diagram y=115. Inclusive screen limits are -120 and height+120.
    expect(visibleSequenceEdges([edge], { x: 0, y: -235, zoom: 1 }, 800)).toEqual([edge]);
    expect(visibleSequenceEdges([edge], { x: 0, y: -235.01, zoom: 1 }, 800)).toEqual([]);
    expect(visibleSequenceEdges([edge], { x: 0, y: 805, zoom: 1 }, 800)).toEqual([edge]);
    expect(visibleSequenceEdges([edge], { x: 0, y: 805.01, zoom: 1 }, 800)).toEqual([]);
  });
  it('fails open while measuring or with unknown geometry', () => {
    for (const height of [0, -1, NaN]) expect(visibleSequenceEdges(layout.rfEdges, { x: 0, y: 0, zoom: 1 }, height)).toBe(layout.rfEdges);
    expect(visibleSequenceEdges(layout.rfEdges, { x: 0, y: 0, zoom: 0 }, 800)).toBe(layout.rfEdges);
    const custom = { id: 'custom', source: 'a', target: 'b', data: {} } as Edge;
    expect(visibleSequenceEdges([custom], { x: 0, y: -50000, zoom: 1 }, 100)).toEqual([custom]);
    expect(visibleSequenceEdges([], { x: 0, y: 0, zoom: 1 }, 800)).toEqual([]);
  });
});
