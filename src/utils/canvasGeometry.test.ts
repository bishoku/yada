import { describe, expect, it } from 'vitest';
import type { LogicalDiagram, VisualDiagram } from '../types';
import { getCanvasGeometry } from './canvasGeometry';
const logical: LogicalDiagram = { schemaVersion: 2, nodes: [{ id: 'section', name: 'Group', type: 'section' }, { id: 'a', name: 'A', type: 'client', parentId: 'section' }, { id: 'b', name: 'B', type: 'server' }], edges: [{ id: 'ab', sourceId: 'a', targetId: 'b', isAsync: false }, { id: 'ba', sourceId: 'b', targetId: 'a', isAsync: false }, { id: 'plain', sourceId: 'a', targetId: 'b', isAsync: false }], sequences: [{ id: 's1', edgeId: 'ab', stepNumber: 2, isAsync: false }, { id: 's2', edgeId: 'ba', stepNumber: 1, isAsync: false }, { id: 's3', edgeId: 'ab', stepNumber: 3, isAsync: false }] };
const visual: VisualDiagram = { canvas: { zoom: 1, pan: { x: 0, y: 0 } }, layoutNodes: { section: { id: 'section', x: 100, y: 200 }, a: { id: 'a', x: 10, y: 20 }, b: { id: 'b', x: 500, y: 300 } }, layoutEdges: {}, timelines: {} };
describe('canvas export geometry cache', () => {
  it('preserves nested positions, defaults, opposite-direction parallel offsets and step order', () => {
    const geometry = getCanvasGeometry(logical, visual);
    expect(geometry.absolutePosition('a')).toEqual({ x: 110, y: 220, width: 224, height: 52 });
    expect(geometry.absolutePosition('missing')).toEqual({ x: 0, y: 0, width: 224, height: 52 });
    expect(geometry.offsets.get('ba')).toBe(30);
    expect(geometry.offsets.get('ab')).toBe(0);
    expect(geometry.offsets.get('plain')).toBe(30);
    expect(geometry.stepsByEdge.get('ab')?.map(step => step.id)).toEqual(['s1', 's3']);
  });
  it('matches the former parallel-edge algorithm including unsequenced/tied steps', () => {
    for (const edge of logical.edges) {
      const siblings = logical.edges.filter(other => other.sourceId === edge.sourceId && other.targetId === edge.targetId || other.sourceId === edge.targetId && other.targetId === edge.sourceId).sort((a, b) => {
        const minimum = (id: string) => { const steps = logical.sequences.filter(step => step.edgeId === id); return steps.length ? Math.min(...steps.map(step => step.stepNumber)) : 999; };
        return minimum(a.id) - minimum(b.id) || a.id.localeCompare(b.id);
      });
      const index = siblings.findIndex(other => other.id === edge.id);
      const expected = (-(siblings.length - 1) * 15 + index * 30) * (edge.sourceId > edge.targetId ? -1 : 1);
      expect(getCanvasGeometry(logical, visual).offsets.get(edge.id)).toBe(expected);
    }
  });
  it('reuses geometry across frames and invalidates for layout or logical revisions without writes', () => {
    const before = JSON.stringify({ logical, visual });
    const cached = getCanvasGeometry(logical, visual);
    expect(getCanvasGeometry(logical, visual)).toBe(cached);
    expect(cached.absolutePosition('a')).toBe(cached.absolutePosition('a'));
    const moved = { ...visual, layoutNodes: { ...visual.layoutNodes, a: { ...visual.layoutNodes.a, x: 50 } } };
    expect(getCanvasGeometry(logical, moved).absolutePosition('a').x).toBe(150);
    const detached = { ...logical, nodes: logical.nodes.map(node => node.id === 'a' ? { ...node, parentId: undefined } : node) };
    expect(getCanvasGeometry(detached, visual).absolutePosition('a').x).toBe(10);
    expect(JSON.stringify({ logical, visual })).toBe(before);
  });
  it('does not overflow on malformed legacy parent cycles', () => {
    const cyclic = { ...logical, nodes: logical.nodes.map(node => node.id === 'section' ? { ...node, parentId: 'a' } : node) };
    expect(Number.isFinite(getCanvasGeometry(cyclic, visual).absolutePosition('a').x)).toBe(true);
  });
  it('reports parallel-edge lookup cost across 240 frame queries', () => {
    const large: LogicalDiagram = { ...logical,
      edges: Array.from({ length: 1000 }, (_, i) => ({ id: `e${i}`, sourceId: `n${i % 20}`, targetId: `n${(i + 1) % 20}`, isAsync: false })),
      sequences: Array.from({ length: 1000 }, (_, i) => ({ id: `s${i}`, edgeId: `e${i}`, stepNumber: i + 1, isAsync: false })),
    };
    const queries = Array.from({ length: 240 }, (_, i) => large.edges[i * 4]);
    const before = performance.now();
    const expected = queries.map(edge => {
      const siblings = large.edges.filter(other => other.sourceId === edge.sourceId && other.targetId === edge.targetId || other.sourceId === edge.targetId && other.targetId === edge.sourceId).sort((a, b) => {
        const minimum = (id: string) => { const steps = large.sequences.filter(step => step.edgeId === id); return steps.length ? Math.min(...steps.map(step => step.stepNumber)) : 999; };
        return minimum(a.id) - minimum(b.id) || a.id.localeCompare(b.id);
      });
      return (-(siblings.length - 1) * 15 + siblings.findIndex(other => other.id === edge.id) * 30) * (edge.sourceId > edge.targetId ? -1 : 1);
    });
    const legacyMs = performance.now() - before;
    const buildStart = performance.now();
    const geometry = getCanvasGeometry(large, visual);
    const buildMs = performance.now() - buildStart;
    const after = performance.now();
    const actual = queries.map(edge => geometry.offsets.get(edge.id));
    const cachedMs = performance.now() - after;
    expect(actual).toEqual(expected);
    console.info(JSON.stringify({ canvasGeometryBenchmark: 1000, queries: 240, legacyMs, buildMs, cachedMs }));
  });

});
