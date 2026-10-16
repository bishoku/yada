import outfitLicense from '/fonts/outfit-LICENSE.txt?raw';
import jakartaLicense from '/fonts/plus-jakarta-sans-LICENSE.txt?raw';
// Inline assets keep downloaded HTML players independent of the application's host.
import outfitLatin from '/fonts/outfit-latin-wght-normal.woff2?inline';
import outfitExtended from '/fonts/outfit-latin-ext-wght-normal.woff2?inline';
import jakartaLatin from '/fonts/plus-jakarta-sans-latin-wght-normal.woff2?inline';
import jakartaExtended from '/fonts/plus-jakarta-sans-latin-ext-wght-normal.woff2?inline';
const latin = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const extended = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
const credits = `/* ${outfitLicense.replace(/\*\//g, '* /')} */\n/* ${jakartaLicense.replace(/\*\//g, '* /')} */\n`;
export const portableUiFontsCss = credits + [
  ['Outfit', '100 900', outfitLatin, latin], ['Outfit', '100 900', outfitExtended, extended],
  ['Plus Jakarta Sans', '200 800', jakartaLatin, latin], ['Plus Jakarta Sans', '200 800', jakartaExtended, extended],
].map(([family,weight,url,range]) => `@font-face{font-family:'${family}';font-style:normal;font-display:swap;font-weight:${weight};src:url('${url}') format('woff2');unicode-range:${range};}`).join('\n');
