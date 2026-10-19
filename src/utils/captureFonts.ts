import { getFontEmbedCSS } from 'html-to-image';
const normalize = (family: string) => family.trim().replace(/["']/g,'').toLowerCase();
/** Retain all weight/unicode variants of used families, without repeating unrelated editor fonts. */
export function filterCaptureFonts(css: string, families: string[]) {
  const used = new Set(families.map(normalize));
  const faces = css.match(/@font-face\s*\{[^}]*\}/gi) ?? [];
  const filtered = faces.filter(face=>used.has(normalize(face.match(/font-family\s*:\s*([^;}]*)/i)?.[1] ?? '')));
  return filtered.length ? filtered.join('\n') : css;
}
export async function captureFontCSS(node: HTMLElement) {
  // WebKit retains format('woff2-variations'); requesting only 'woff2' deletes those sources.
  const css = await getFontEmbedCSS(node);
  const families = Array.from(new Set([node,...node.querySelectorAll('*')].flatMap(element=>getComputedStyle(element).fontFamily.split(','))));
  return filterCaptureFonts(css,families);
}
