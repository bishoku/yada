export interface Point {
  x: number;
  y: number;
}

/**
 * Generates an SVG path for an edge that passes through an array of waypoints,
 * smoothly rounding the corners using quadratic bezier curves (Q).
 * 
 * @param source The starting point of the edge
 * @param target The ending point of the edge
 * @param waypoints An array of intermediate points
 * @param borderRadius The radius for rounding corners (default: 12)
 * @returns [pathData, labelX, labelY]
 */
export function getWaypointPath(
  source: Point,
  target: Point,
  waypoints: Point[],
  borderRadius: number = 12
): [string, number, number] {
  if (!waypoints || waypoints.length === 0) {
    return [`M ${source.x},${source.y} L ${target.x},${target.y}`, (source.x + target.x) / 2, (source.y + target.y) / 2];
  }

  const points = [source, ...waypoints, target];
  let path = `M ${source.x},${source.y}`;

  let maxLen = 0;
  let labelX = (source.x + target.x) / 2;
  let labelY = (source.y + target.y) / 2;

  for (let i = 1; i < points.length; i++) {
    const pPrev = points[i - 1];
    const pCurr = points[i];
    const pNext = points[i + 1];

    const dx1 = pCurr.x - pPrev.x;
    const dy1 = pCurr.y - pPrev.y;
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

    // Update label position based on the longest segment
    if (len1 > maxLen) {
      maxLen = len1;
      labelX = pPrev.x + dx1 / 2;
      labelY = pPrev.y + dy1 / 2;
    }

    if (pNext) {
      const dx2 = pNext.x - pCurr.x;
      const dy2 = pNext.y - pCurr.y;
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

      // Clamp radius so it doesn't overshoot the segment half-length
      const r = Math.min(borderRadius, len1 / 2, len2 / 2);

      // Vector from pCurr back to pPrev
      const uX = len1 === 0 ? 0 : -dx1 / len1;
      const uY = len1 === 0 ? 0 : -dy1 / len1;

      // Vector from pCurr to pNext
      const vX = len2 === 0 ? 0 : dx2 / len2;
      const vY = len2 === 0 ? 0 : dy2 / len2;

      const curveStartX = pCurr.x + uX * r;
      const curveStartY = pCurr.y + uY * r;

      const curveEndX = pCurr.x + vX * r;
      const curveEndY = pCurr.y + vY * r;

      path += ` L ${curveStartX},${curveStartY}`;
      
      if (r > 0) {
        path += ` Q ${pCurr.x},${pCurr.y} ${curveEndX},${curveEndY}`;
      }
    } else {
      // Last point (target)
      path += ` L ${pCurr.x},${pCurr.y}`;
    }
  }

  return [path, labelX, labelY];
}

/**
 * Generates an SVG path for an edge that passes through an array of waypoints,
 * smoothly interpolating them using a Catmull-Rom spline converted to Cubic Beziers.
 * This is used for "bezier" connection type.
 * 
 * @param source The starting point of the edge
 * @param target The ending point of the edge
 * @param waypoints An array of intermediate points
 * @param tension Curve tension (default 0.2)
 * @returns [pathData, labelX, labelY]
 */
export function getSplineWaypointPath(
  source: Point,
  target: Point,
  waypoints: Point[],
  tension: number = 0.2
): [string, number, number] {
  if (!waypoints || waypoints.length === 0) {
    return [`M ${source.x},${source.y} L ${target.x},${target.y}`, (source.x + target.x) / 2, (source.y + target.y) / 2];
  }

  const pts = [source, ...waypoints, target];
  let path = `M ${pts[0].x},${pts[0].y}`;
  
  let maxLen = 0;
  let labelX = (source.x + target.x) / 2;
  let labelY = (source.y + target.y) / 2;

  for (let i = 0; i < pts.length - 1; i++) {
    // Determine control points for Catmull-Rom
    // If it's the first or last point, mirror the adjacent point to create a synthetic control point
    const p0 = i === 0 ? { x: pts[0].x - (pts[1].x - pts[0].x), y: pts[0].y - (pts[1].y - pts[0].y) } : pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = i === pts.length - 2 ? { x: pts[i+1].x + (pts[i+1].x - pts[i].x), y: pts[i+1].y + (pts[i+1].y - pts[i].y) } : pts[i + 2];

    // Convert Catmull-Rom to Cubic Bezier
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;

    // Find the longest segment to place the label
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len > maxLen) {
      maxLen = len;
      // Calculate bezier curve at t=0.5 for label placement
      labelX = 0.125 * p1.x + 0.375 * cp1x + 0.375 * cp2x + 0.125 * p2.x;
      labelY = 0.125 * p1.y + 0.375 * cp1y + 0.375 * cp2y + 0.125 * p2.y;
    }
  }

  return [path, labelX, labelY];
}
