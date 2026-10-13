import { describe, expect, it } from 'vitest';
import type { LogicalDiagram } from '../../../types';
import { buildSectionIntervals, maximumTimelineEnd, sectionActiveAt } from './sectionPlayback';

function fixture(count: number) {
  const nodes = [{ id: 'section', type: 'section', name: 'Section' }, ...Array.from({ length: count }, (_, i) => ({ id: `n${i}`, type: 'server', name: `${i}`, parentId: i % 2 ? `n${i - 1}` : 'section' }))];
  const edges = Array.from({ length: count }, (_, i) => ({ id: `e${i}`, sourceId: `n${i}`, targetId: 'external', isAsync: false }));
  const sequences = edges.map((edge, i) => ({ id: `s${i}`, edgeId: edge.id, stepNumber: i + 1, isAsync: false }));
  const logical: LogicalDiagram = { schemaVersion: 2, nodes, edges, sequences };
  const schedules = Object.fromEntries(sequences.map((seq, i) => [seq.id, { start: i * 20, end: i * 20 + 10 }]));
  return { logical, schedules };
}
// Reference matches the previous hook's descendant/edge scans and half-open boundaries.
function legacy(section: string, logical: LogicalDiagram, schedules: Record<string, { start: number; end: number }>, time: number) {
  const descendants = new Set<string>();
  function visit(id: string) {
    for (const node of logical.nodes.filter(node => node.parentId === id)) { descendants.add(node.id); visit(node.id); }
  }
  visit(section);
  const edges = new Set(logical.edges.filter(edge => descendants.has(edge.sourceId) || descendants.has(edge.targetId)).map(edge => edge.id));
  return logical.sequences.some(seq => edges.has(seq.edgeId) && schedules[seq.id] && time >= schedules[seq.id].start && time < schedules[seq.id].end);
}

describe('section playback compatibility', () => {
  it('matches legacy nested activity through boundaries, reverse seeks and concurrent intervals', () => {
    const { logical, schedules } = fixture(40);
    schedules.s2 = { start: 0, end: 55 };
    schedules.s3 = { start: 55, end: 60 };
    schedules.s4 = { start: 70, end: 70 };
    delete schedules.s5;
    const intervals = buildSectionIntervals('section', logical, schedules);
    for (let time = 820; time >= -1; time -= 0.5) expect(sectionActiveAt(intervals, time)).toBe(legacy('section', logical, schedules, time));
    expect(buildSectionIntervals('absent', logical, schedules)).toEqual([]);
  });
  it('handles cycles and does not mutate stored data or schedules', () => {
    const { logical, schedules } = fixture(4);
    logical.nodes[0].parentId = 'n1';
    const before = JSON.stringify({ logical, schedules });
    expect(buildSectionIntervals('section', logical, schedules).length).toBe(4);
    expect(JSON.stringify({ logical, schedules })).toBe(before);
  });
  it('shares maximum duration by immutable schedule revision', () => {
    const { schedules } = fixture(4);
    expect(maximumTimelineEnd(schedules)).toBe(70);
    expect(maximumTimelineEnd(schedules)).toBe(70);
    expect(maximumTimelineEnd({ ...schedules, extra: { start: 0, end: 500 } })).toBe(500);
    expect(maximumTimelineEnd({})).toBe(0);
  });
  it('reports reproducible CPU work for small, medium and large fixtures', () => {
    for (const count of [25, 250, 1000]) {
      const { logical, schedules } = fixture(count);
      const startBuild = performance.now();
      const intervals = buildSectionIntervals('section', logical, schedules);
      const buildMs = performance.now() - startBuild;
      const times = Array.from({ length: 240 }, (_, i) => i / 239 * count * 20);
      const before = performance.now();
      const expected = times.map(time => legacy('section', logical, schedules, time));
      const legacyMs = performance.now() - before;
      const after = performance.now();
      const actual = times.map(time => sectionActiveAt(intervals, time));
      const indexedMs = performance.now() - after;
      expect(actual).toEqual(expected);
      console.info(JSON.stringify({ sectionPlaybackBenchmark: count, samples: times.length, buildMs, legacyMs, indexedMs }));
    }
  });
});
