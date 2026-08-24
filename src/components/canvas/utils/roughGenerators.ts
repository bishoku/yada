import rough from 'roughjs';
import type { Options } from 'roughjs/bin/core';
import type { Drawable, OpSet } from 'roughjs/bin/core';

// Create a singleton generator instance
const generator = rough.generator();

export interface RoughPathResult {
  strokePath: string;
  fillPath?: string;
  fillSketchPath?: string;
}

/**
 * Calculates a deterministic positive integer seed from any string ID.
 */
export function getNumericSeed(id?: string): number {
  if (!id) return 42;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 42;
}

/**
 * Converts a Rough.js OpSet into an SVG path `d` string.
 */
export function opSetToPath(opSet: OpSet): string {
  return generator.opsToPath(opSet);
}

/**
 * Converts a Rough.js Drawable into separated stroke, fill, and sketch paths.
 */
export function drawableToPaths(drawable: Drawable): RoughPathResult {
  let strokePath = '';
  let fillPath: string | undefined;
  let fillSketchPath: string | undefined;

  for (const set of drawable.sets) {
    const setType = set.type as string;
    if (setType === 'path' || setType === 'draw') {
      strokePath += (strokePath ? ' ' : '') + generator.opsToPath(set);
    } else if (setType === 'fillPath') {
      fillPath = (fillPath ? fillPath + ' ' : '') + generator.opsToPath(set);
    } else if (setType === 'fillSketch') {
      fillSketchPath = (fillSketchPath ? fillSketchPath + ' ' : '') + generator.opsToPath(set);
    }
  }

  // Fallback if sets had untyped or single stroke item
  if (!strokePath && drawable.sets.length > 0) {
    strokePath = generator.opsToPath(drawable.sets[0]);
  }

  return { strokePath, fillPath, fillSketchPath };
}

/**
 * Generates an SVG path `d` string or array of paths from a Rough.js Drawable.
 */
export function drawableToSvgPaths(drawable: Drawable): string[] {
  return drawable.sets.map((set) => generator.opsToPath(set));
}

/**
 * Generates rough rectangle SVG path data.
 */
export function getRoughRectanglePaths(
  x: number,
  y: number,
  width: number,
  height: number,
  options?: Options
): RoughPathResult {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const drawable = generator.rectangle(x, y, w, h, {
    roughness: 1.2,
    bowing: 1.2,
    strokeWidth: 1.5,
    ...options,
  });

  return drawableToPaths(drawable);
}

/**
 * Generates rough rounded rectangle SVG path data.
 */
export function getRoughRoundedRectPaths(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number = 8,
  options?: Options
): RoughPathResult {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const r = Math.min(radius, w / 2, h / 2);
  const pathData = `
    M ${x + r} ${y}
    H ${x + w - r}
    Q ${x + w} ${y} ${x + w} ${y + r}
    V ${y + h - r}
    Q ${x + w} ${y + h} ${x + w - r} ${y + h}
    H ${x + r}
    Q ${x} ${y + h} ${x} ${y + h - r}
    V ${y + r}
    Q ${x} ${y} ${x + r} ${y}
    Z
  `;

  return getRoughCustomPath(pathData, options);
}

/**
 * Generates rough ellipse SVG path data.
 */
export function getRoughEllipsePaths(
  x: number,
  y: number,
  width: number,
  height: number,
  options?: Options
): RoughPathResult {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const drawable = generator.ellipse(centerX, centerY, w, h, {
    roughness: 1.2,
    bowing: 1.2,
    strokeWidth: 1.5,
    ...options,
  });

  return drawableToPaths(drawable);
}

/**
 * Generates rough diamond / rhombus SVG path data.
 */
export function getRoughDiamondPaths(
  x: number,
  y: number,
  width: number,
  height: number,
  options?: Options
): RoughPathResult {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const points: [number, number][] = [
    [x + w / 2, y],
    [x + w, y + h / 2],
    [x + w / 2, y + h],
    [x, y + h / 2],
  ];

  return getRoughPolygonPaths(points, options);
}

/**
 * Generates rough polygon SVG path data.
 */
export function getRoughPolygonPaths(
  points: [number, number][],
  options?: Options
): RoughPathResult {
  if (!points || points.length < 3) return { strokePath: '' };
  const drawable = generator.polygon(points, {
    roughness: 1.2,
    bowing: 1.2,
    strokeWidth: 1.5,
    ...options,
  });

  return drawableToPaths(drawable);
}

/**
 * Generates rough SVG path data from an arbitrary SVG path string `d`.
 */
export function getRoughCustomPath(
  d: string,
  options?: Options
): RoughPathResult {
  if (!d) return { strokePath: '' };
  try {
    const drawable = generator.path(d, {
      roughness: 1.2,
      bowing: 1.2,
      strokeWidth: 1.5,
      ...options,
    });

    return drawableToPaths(drawable);
  } catch (e) {
    console.warn('Rough.js path generation error:', e);
    return { strokePath: d };
  }
}

/**
 * Generates a rough line SVG path string.
 */
export function getRoughLinePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options?: Options
): string {
  const drawable = generator.line(x1, y1, x2, y2, {
    roughness: 1.2,
    bowing: 1.2,
    strokeWidth: 1.5,
    ...options,
  });
  return drawable.sets.map((s) => generator.opsToPath(s)).join(' ');
}

/**
 * Generates rough arrow paths (stem line + arrowhead paths).
 */
export function getRoughArrowPaths(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options?: Options
): { linePath: string; headPath: string } {
  const linePath = getRoughLinePath(x1, y1, x2, y2, options);

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const strokeWidth = options?.strokeWidth ?? 2;
  const headLen = Math.max(12, strokeWidth * 3.5);
  const h1x = x2 - headLen * Math.cos(angle - Math.PI / 6);
  const h1y = y2 - headLen * Math.sin(angle - Math.PI / 6);
  const h2x = x2 - headLen * Math.cos(angle + Math.PI / 6);
  const h2y = y2 - headLen * Math.sin(angle + Math.PI / 6);

  const headDrawable = generator.polygon(
    [
      [h1x, h1y],
      [x2, y2],
      [h2x, h2y],
    ],
    {
      roughness: 1.0,
      bowing: 1.0,
      strokeWidth: options?.strokeWidth ?? 2,
      ...options,
    }
  );

  const headPath = headDrawable.sets.map((s) => generator.opsToPath(s)).join(' ');

  return { linePath, headPath };
}

export { generator as roughGenerator };
