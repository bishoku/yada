import { describe, expect, it } from 'vitest';
import { sampleCubicPath, pointAtProgress } from './pathSampling';
describe('cubic particle geometry', () => {
  it('preserves endpoints, clamps seeks and follows distance rather than cubic parameter', () => {
    const samples=sampleCubicPath('M 0,0 C 0,100 100,100 100,0')!;
    expect(pointAtProgress(samples,-1)).toMatchObject({x:0,y:0});
    expect(pointAtProgress(samples,2)).toMatchObject({x:100,y:0});
    const middle=pointAtProgress(samples,0.5);
    expect(middle.x).toBeCloseTo(50,5); expect(middle.y).toBeCloseTo(75,5);
    expect(middle.angle).toBeCloseTo(0,4);
    expect(samples.every((sample,i) => !i || sample.progress>=samples[i-1].progress)).toBe(true);
  });
  it('matches a dense numerical reference on a long parallel curve within 0.5 canvas units', () => {
    const coordinates=[[-200,0],[1000,-1400],[50,1800],[800,10]];
    const path='M -200,0 C 1000,-1400 50,1800 800,10';
    const samples=sampleCubicPath(path)!;
    let length=0; const reference:{x:number;y:number;length:number}[]=[];
    for(let i=0;i<=20000;i++) {
      const t=i/20000,u=1-t;
      const [x,y]=[0,1].map(axis=>u*u*u*coordinates[0][axis]+3*u*u*t*coordinates[1][axis]+3*u*t*t*coordinates[2][axis]+t*t*t*coordinates[3][axis]);
      const previous=reference[reference.length-1]; if(previous)length+=Math.hypot(x-previous.x,y-previous.y);
      reference.push({x,y,length});
    }
    for(const fraction of [0.01,0.1,0.3,0.5,0.7,0.9,0.99]) {
      const expected=reference.find(point=>point.length>=length*fraction)!;
      const actual=pointAtProgress(samples,fraction);
      expect(Math.hypot(actual.x-expected.x,actual.y-expected.y)).toBeLessThan(0.5);
    }
  });
  it('handles self loops and collinear backtracking without dropping the path', () => {
    for(const path of ['M0,0 C100,-100 -100,-100 0,0','M0,0 C100,0 -100,0 0,0']) {
      const samples=sampleCubicPath(path)!;
      expect(samples.length).toBeGreaterThan(2);
      expect(samples.every(sample=>Number.isFinite(sample.angle))).toBe(true);
      expect(pointAtProgress(samples,1)).toMatchObject({x:0,y:0});
    }
    expect(sampleCubicPath('M0,0 C0,0 0,0 0,0')).toEqual([]);
  });
  it('leaves compound, orthogonal and relative paths to the SVG fallback', () => {
    for(const path of ['M0,0 L10,10','M0,0 C1,1 2,2 3,3 C4,4 5,5 6,6','m0,0 c1,1 2,2 3,3']) expect(sampleCubicPath(path)).toBeNull();
    expect(sampleCubicPath('M1e2,-2 C3,4 5,6 7,8')?.[0]).toMatchObject({x:100,y:-2});
  });
});
