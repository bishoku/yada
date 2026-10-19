import {expect,it} from 'vitest';
import {particleCaptureMatrix} from './particleCaptureGeometry';
const box={x:-4,y:-4,width:8,height:8};
it('keeps an accurate browser matrix relative to the capture root',()=>{
 expect(particleCaptureMatrix({a:2,b:0,c:0,d:2,e:100,f:200},box,{x:92,y:192,width:16,height:16},{left:10,top:20})).toEqual({a:2,b:0,c:0,d:2,e:90,f:180});
});
it('recovers a missing WebKit ancestor zoom and translation from painted bounds',()=>{
 expect(particleCaptureMatrix({a:1,b:0,c:0,d:1,e:999,f:999},box,{x:392,y:192,width:16,height:16},{left:100,top:50})).toEqual({a:2,b:0,c:0,d:2,e:300,f:150});
});
it('retains directional rotation and accounts for off-centre SVG circles',()=>{
 const matrix=particleCaptureMatrix({a:0,b:1,c:-1,d:0,e:0,f:0},{x:16,y:26,width:8,height:8},{x:92,y:192,width:16,height:16},{left:0,top:0});
 expect(matrix).toEqual({a:0,b:2,c:-2,d:0,e:160,f:160});expect(matrix.e+matrix.a*20+matrix.c*30).toBe(100);expect(matrix.f+matrix.b*20+matrix.d*30).toBe(200);
});
