import rough from 'roughjs';
import type { Options } from 'roughjs/bin/core';
import type { Drawable, OpSet } from 'roughjs/bin/core';

// Create a singleton generator instance
const generator = rough.generator();

/**
 * Converts a Rough.js OpSet into an SVG path `d` string.
 */
export function opSetToPath(opSet: OpSet): string {
  return generator.opsToPath(opSet);
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
): { strokePath: string; fillPath?: string } {
  const drawable = generator.rectangle(x, y, width, height, {
    roughness: 1.2,
    bowing: 1.2,
    strokeWidth: 1.5,
    ...options,
  });

  const paths = drawable.sets.map((s) => generator.opsToPath(s));
  return {
    strokePath: paths[0] || '',
    fillPath: paths.length > 1 ? paths.slice(1).join(' ') : undefined,
  };
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
): { strokePath: string; fillPath?: string } {
  const r = Math.min(radius, width / 2, height / 2);
  const pathData = `
    M ${x + r} ${y}
    H ${x + width - r}
    Q ${x + width} ${y} ${x + width} ${y + r}
    V ${y + height - r}
    Q ${x + width} ${y + height} ${x + width - r} ${y + height}
    H ${x + r}
    Q ${x} ${y + height} ${x} ${y + height - r}
    V ${y + r}
    Q ${x} ${y} ${x + r} ${y}
    Z
  `;

  return getRoughCustomPath(pathData, options);
}

/**
 * Generates rough SVG path data from an arbitrary SVG path string `d`.
 */
export function getRoughCustomPath(
  d: string,
  options?: Options
): { strokePath: string; fillPath?: string } {
  if (!d) return { strokePath: '' };
  try {
    const drawable = generator.path(d, {
      roughness: 1.2,
      bowing: 1.2,
      strokeWidth: 1.5,
      ...options,
    });

    const paths = drawable.sets.map((s) => generator.opsToPath(s));
    return {
      strokePath: paths[0] || '',
      fillPath: paths.length > 1 ? paths.slice(1).join(' ') : undefined,
    };
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

export { generator as roughGenerator };
