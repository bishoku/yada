import type { EdgeArrowType } from '../../../types';
export interface Point { x: number; y: number }
export interface Bounds extends Point { width: number; height: number }
export const RECONNECT_RADIUS = 12;

/** React Flow shifts the generous reconnect hit area away from the port. */
export function reconnectCenter(point: Point, side: string): Point {
  return { x: point.x + (side === 'left' ? -RECONNECT_RADIUS : side === 'right' ? RECONNECT_RADIUS : 0), y: point.y + (side === 'top' ? -RECONNECT_RADIUS : side === 'bottom' ? RECONNECT_RADIUS : 0) };
}

/** Anchor the actual glyph tip, rather than the marker viewport, at the port. */
export function arrowReference(type: EdgeArrowType, start = false) {
  const end = type === 'circle' ? 7.05 : type === 'diamond' ? 8.25 : type === 'open' ? 8.75 : 8;
  return start ? 8 - end : end;
}

function overlap(a: Bounds, b: Bounds) {
  return Math.max(0, Math.min(a.x + a.width, b.x + b.width + 6) - Math.max(a.x, b.x - 6)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height + 6) - Math.max(a.y, b.y - 6));
}

/** Local placement only: retain the authored path position, clear traffic and endpoint cards. */
export function placeEdgeLabel(anchor: Point, tangent: Point, size: { width: number; height: number }, nodes: Bounds[]) {
  const vertical = Math.abs(tangent.y) > Math.abs(tangent.x);
  const cross = vertical ? size.width / 2 + 22 : size.height / 2 + 22;
  const along = vertical ? size.height + 8 : size.width + 8;
  const candidates = [1, -1].flatMap(side => [0, -along, along].map(shift => ({
    x: anchor.x + (vertical ? side * cross : shift),
    y: anchor.y + (vertical ? shift : -side * cross),
  })));
  let best = candidates[0], bestScore = Infinity;
  candidates.forEach((point, index) => {
    const box = { x: point.x - size.width / 2, y: point.y - size.height / 2, ...size };
    const score = nodes.reduce((sum, node) => sum + overlap(box, node), 0) * 1000 + index;
    if (score < bestScore) { best = point; bestScore = score; }
  });
  return best;
}

/** Align the glyph with the part of the curve it covers, not an infinitesimal endpoint turn. */
export function endpointArrowAngles(path: { getTotalLength(): number; getPointAtLength(distance: number): Point }, footprint: number) {
  const length = path.getTotalLength();
  const span = Math.min(Math.max(footprint, 0.01), length / 2);
  const angle = (a: Point, b: Point) => Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  return {
    start: angle(path.getPointAtLength(0), path.getPointAtLength(span)),
    end: angle(path.getPointAtLength(length - span), path.getPointAtLength(length)),
  };
}
