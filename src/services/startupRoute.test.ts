import { expect, it } from 'vitest';
import { canPreloadWelcome } from './startupRoute';
it('preloads only an ordinary home route without changing protected routes',()=>{
  for(const href of ['https://yada.test/','https://yada.test/?lang=en#yada=home'])expect(canPreloadWelcome(href,true,false,false)).toBe(true);
  for(const suffix of ['#yada=diagram&w=w123&d=default','?ref=abc123','?share=data','?embed=true','?collab=room','?mode=modal','?integration=iframe'])expect(canPreloadWelcome('https://yada.test/'+suffix,true,false,false)).toBe(false);
  expect(canPreloadWelcome('https://yada.test/',false,false,false)).toBe(false);
  expect(canPreloadWelcome('https://yada.test/',true,true,false)).toBe(false);
  expect(canPreloadWelcome('https://yada.test/',true,false,true)).toBe(false);
});
