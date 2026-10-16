export interface PathSample { x: number; y: number; angle: number; progress: number }
type Point = { x: number; y: number };
const distance = (a: Point,b: Point) => Math.hypot(b.x-a.x,b.y-a.y);
const midpoint = (a: Point,b: Point): Point => ({x:(a.x+b.x)/2,y:(a.y+b.y)/2});

/** Approximate one cubic with <=0.15 canvas-unit flatness. No SVG layout queries. */
export function sampleCubicPath(path: string): PathSample[] | null {
  const tokens = path.match(/[A-Za-z]|[-+]?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?/g) ?? [];
  if (tokens.length !== 10 || tokens[0] !== 'M' || tokens[3] !== 'C') return null;
  const values = [...tokens.slice(1,3),...tokens.slice(4)].map(Number);
  if (values.some(value => !Number.isFinite(value))) return null;
  const [p0,p1,p2,p3] = Array.from({length:4},(_,i) => ({x:values[i*2],y:values[i*2+1]}));
  const points: (Point & {t:number})[] = [{...p0,t:0}];
  function subdivide(a:Point,b:Point,c:Point,d:Point,start:number,end:number,depth:number) {
    const chord = distance(a,d);
    const polygon = distance(a,b)+distance(b,c)+distance(c,d);
    const cross = (p:Point) => chord ? Math.abs((d.x-a.x)*(a.y-p.y)-(a.x-p.x)*(d.y-a.y))/chord : distance(a,p);
    if (depth >= 14 || (polygon-chord <= 0.15 && Math.max(cross(b),cross(c)) <= 0.15)) {
      points.push({...d,t:end}); return;
    }
    const ab=midpoint(a,b),bc=midpoint(b,c),cd=midpoint(c,d);
    const abc=midpoint(ab,bc),bcd=midpoint(bc,cd),center=midpoint(abc,bcd),t=(start+end)/2;
    subdivide(a,ab,abc,center,start,t,depth+1); subdivide(center,bcd,cd,d,t,end,depth+1);
  }
  subdivide(p0,p1,p2,p3,0,1,0);
  let length=0;
  const samples = points.map((point,i) => {
    if (i) length+=distance(points[i-1],point);
    // Avoid a zero derivative at coincident endpoint controls.
    const t=Math.min(1-1e-7,Math.max(1e-7,point.t)),u=1-t;
    const dx=3*u*u*(p1.x-p0.x)+6*u*t*(p2.x-p1.x)+3*t*t*(p3.x-p2.x);
    const dy=3*u*u*(p1.y-p0.y)+6*u*t*(p2.y-p1.y)+3*t*t*(p3.y-p2.y);
    return {x:point.x,y:point.y,angle:Math.atan2(dy,dx)*180/Math.PI,progress:length};
  });
  if (!length) return [];
  return samples.map(sample => ({...sample,progress:sample.progress/length}));
}

export function pointAtProgress(samples:PathSample[],progress:number) {
  const p=Math.min(1,Math.max(0,progress));
  let low=0,high=samples.length-1;
  while (low+1<high) { const mid=(low+high)>>>1; if(samples[mid].progress<p) low=mid; else high=mid; }
  const a=samples[low],b=samples[high];
  const fraction=b.progress===a.progress?0:(p-a.progress)/(b.progress-a.progress);
  const turn=((b.angle-a.angle+540)%360)-180;
  return {x:a.x+(b.x-a.x)*fraction,y:a.y+(b.y-a.y)*fraction,angle:a.angle+turn*fraction};
}
