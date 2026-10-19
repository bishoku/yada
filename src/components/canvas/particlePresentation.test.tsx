import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {AnimationParticle} from './ParticleSvg';
import {PARTICLE_DEFS} from '../../config/particles';
it('uses a compact dot without a duplicate step number or halo',()=>{
 const html=renderToStaticMarkup(<svg><AnimationParticle type="dot" rotation={0} stepNumber={6} color="#f43f5e"/></svg>);
 expect(html).toContain('r="4"');expect(html).not.toContain('<text');expect(html.match(/<circle/g)).toHaveLength(1);expect(html).not.toContain('r="16"');expect(html).toContain('#f43f5e');
});
it.each(PARTICLE_DEFS.filter(p=>p.id!=='dot'))('preserves the $id glyph at half scale, with upright protocol symbols',({id})=>{
 const html=renderToStaticMarkup(<svg><AnimationParticle type={id} rotation={0} stepNumber={6}/></svg>);
 expect(html).toContain('scale(0.5)');expect(html).not.toContain('<text');expect(html.includes('data-particle-upright="true"')).toBe(id!=='arrow');
});
