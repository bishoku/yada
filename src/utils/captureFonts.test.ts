import {afterEach,expect,it,vi} from 'vitest';
vi.mock('html-to-image',()=>({getFontEmbedCSS:vi.fn()}));
import {getFontEmbedCSS} from 'html-to-image';
import {captureFontCSS} from './captureFonts';
afterEach(()=>vi.unstubAllGlobals());
import {filterCaptureFonts} from './captureFonts';
it('keeps all used-family weight and unicode variants while dropping unrelated editor fonts',()=>{
 const css='@font-face {font-family:"Inter";font-weight:100 900;src:url(data:a);unicode-range:U+0000-00FF;}\n@font-face {font-family:Inter;src:url(data:b);unicode-range:U+0100-024F;}\n@font-face {font-family:Caveat;src:url(data:c);}';
 const filtered=filterCaptureFonts(css,['Inter','sans-serif']);
 expect(filtered).toContain('data:a');expect(filtered).toContain('data:b');expect(filtered).not.toContain('Caveat');
});
it('normalizes quotes/case and preserves the original CSS if a family cannot be identified',()=>{
 const css="@font-face{font-family:'Plus Jakarta Sans';src:url(data:a);}";
 expect(filterCaptureFonts(css,[' PLUS JAKARTA SANS '])).toBe(css);expect(filterCaptureFonts(css,['unidentified'])).toBe(css);
});

it('does not strip WebKit variable-font sources with a preferred format filter',async()=>{
 const node={querySelectorAll:()=>[]} as unknown as HTMLElement;
 const css="@font-face{font-family:'Plus Jakarta Sans';src:url(data:font/woff2;base64,abc) format('woff2-variations');font-weight:200 800;}";
 vi.mocked(getFontEmbedCSS).mockResolvedValue(css);vi.stubGlobal('getComputedStyle',()=>({fontFamily:'Plus Jakarta Sans,sans-serif'}));
 await expect(captureFontCSS(node)).resolves.toBe(css);expect(getFontEmbedCSS).toHaveBeenCalledWith(node);
});
