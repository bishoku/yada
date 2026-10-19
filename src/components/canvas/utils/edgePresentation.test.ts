import { describe, expect, it } from 'vitest';
import { arrowReference, placeEdgeLabel, reconnectCenter } from './edgePresentation';

describe('compact connection presentation', () => {
  it.each([
    ['left', 88, 100], ['right', 112, 100], ['top', 100, 88], ['bottom', 100, 112],
  ])('matches the unchanged reconnect hit center on %s ports', (side, x, y) => {
    expect(reconnectCenter({ x: 100, y: 100 }, String(side))).toEqual({ x, y });
  });
  it.each(['triangle', 'open', 'diamond', 'circle'] as const)('anchors both %s glyphs at their actual tips', type => {
    expect(arrowReference(type) + arrowReference(type, true)).toBeCloseTo(8);
    expect(arrowReference(type)).toBeGreaterThan(6);
  });
  it('clears the entire animation corridor on short vertical edges', () => {
    const size = { width: 70, height: 20 };
    const point = placeEdgeLabel({ x: 100, y: 100 }, { x: 0, y: 1 }, size, []);
    expect(point.x - size.width / 2).toBeGreaterThanOrEqual(122);
    expect(point.y).toBe(100);
  });
  it('keeps horizontal and reversed labels upright above the line', () => {
    for (const x of [-1, 1]) {
      expect(placeEdgeLabel({ x: 100, y: 100 }, { x, y: 0 }, { width: 70, height: 20 }, [])).toEqual({ x: 100, y: 68 });
    }
  });
  it('chooses the opposite side when a node obstructs the preferred side', () => {
    const point = placeEdgeLabel({ x: 100, y: 100 }, { x: 0, y: 1 }, { width: 70, height: 20 }, [{ x: 120, y: 0, width: 200, height: 300 }]);
    expect(point.x).toBeLessThan(100);
  });
  it('retains a custom along-path anchor rather than centering all labels', () => {
    const point = placeEdgeLabel({ x: 400, y: 250 }, { x: 1, y: 0 }, { width: 70, height: 20 }, []);
    expect(point.x).toBe(400);
  });
});
