interface Rect { x:number;y:number;width:number;height:number }
interface Matrix { a:number;b:number;c:number;d:number;e:number;f:number }
/** WebKit getScreenCTM can omit an ancestor CSS viewport transform. Anchor to painted bounds. */
export function particleCaptureMatrix(matrix: Matrix, box: Rect, screen: Rect, origin: {left:number;top:number}): Matrix {
  const expectedWidth=Math.abs(matrix.a)*box.width+Math.abs(matrix.c)*box.height;
  const expectedHeight=Math.abs(matrix.b)*box.width+Math.abs(matrix.d)*box.height;
  const ratios=[expectedWidth>0?screen.width/expectedWidth:0,expectedHeight>0?screen.height/expectedHeight:0].filter(value=>Number.isFinite(value)&&value>0);
  const scale=ratios.length?ratios.reduce((sum,value)=>sum+value,0)/ratios.length:1;
  const a=matrix.a*scale,b=matrix.b*scale,c=matrix.c*scale,d=matrix.d*scale;
  const x=box.x+box.width/2,y=box.y+box.height/2;
  return {a,b,c,d,e:screen.x+screen.width/2-origin.left-a*x-c*y,f:screen.y+screen.height/2-origin.top-b*x-d*y};
}
