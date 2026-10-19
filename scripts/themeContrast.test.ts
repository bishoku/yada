import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const css = readFileSync('src/index.css', 'utf8');

function luminance(hex: string) {
  const values = hex.match(/[a-f\d]{2}/gi)!.map(channel => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
const base = css.match(/:root\s*\{\s*--ui-accent:\s*(#[\da-f]{6})/i)![1];
for (const theme of ['light', 'dark', 'nord', 'dracula', 'synthwave', 'retro']) {
  it(`keeps small primary button text readable in ${theme}`, () => {
    const color = css.match(new RegExp(`\\.theme-${theme}\\s*\\{\\s*--ui-accent:\\s*(#[\\da-f]{6})`, 'i'))?.[1] ?? base;
    expect(1.05 / (luminance(color) + 0.05)).toBeGreaterThanOrEqual(4.5);
  });
}
