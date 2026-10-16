// Opt-in CPU/heap probe of real store actions. No rendering or simulation playback.
import { it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { useAppStore, setDiagramDataInStore } from '../src/store/useAppStore';

function seed(count: number) {
  const nodes=Array.from({length:count},(_,i)=>({id:`n${i}`,name:`Service ${i}`,type:'server'}));
  const edges=nodes.slice(1).map((node,i)=>({id:`e${i}`,sourceId:`n${i}`,targetId:node.id,isAsync:false}));
  const sequences=edges.map((edge,i)=>({id:`s${i}`,edgeId:edge.id,stepNumber:i+1,isAsync:false}));
  const strokes=Object.fromEntries(Array.from({length:10},(_,i)=>[`stroke${i}`,{id:`stroke${i}`,tool:'pen',color:'#6366f1',size:3,opacity:1,points:Array.from({length:500},(_,j)=>({x:j,y:j%80}))}]));
  const logical={schemaVersion:2,nodes,edges,sequences};
  const visual={canvas:{zoom:1,pan:{x:0,y:0}},layoutNodes:Object.fromEntries(nodes.map((node,i)=>[node.id,{id:node.id,x:i*240,y:80}])),layoutEdges:{},timelines:Object.fromEntries(sequences.map(seq=>[seq.id,{sequenceId:seq.id,duration:1000,delay:0}])),freehandStrokes:strokes};
  setDiagramDataInStore(logical,visual as any,false);
  useAppStore.setState({pastStates:[],futureStates:[],isDirty:false});
  return {logical,visual};
}
const summary=(values:number[])=> { const sorted=[...values].sort((a,b)=>a-b);return {median:sorted[Math.floor(sorted.length/2)],p95:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]}; };
function uniqueSize(roots: unknown[]) {
  const seen=new Set<object>();let strings=0;
  const visit=(value:unknown)=>{if(typeof value==='string')strings+=value.length*2;else if(value&&typeof value==='object'&&!seen.has(value)){seen.add(value);for(const entry of Object.values(value))visit(entry);}};
  roots.forEach(visit);return {objects:seen.size,stringValueUtf16Bytes:strings};
}
it('records edit, history and retained heap costs',()=>{
  if (process.env.YADA_HISTORY_BASELINE === '1') expect((globalThis as any).__legacyHistory).toBe(true);
  expect(typeof globalThis.gc).toBe('function');
  const initial=useAppStore.getState();const results=[];
  try {
    for(const count of [25,250]) {
      const samples=[];
      for(let run=0;run<6;run++) {
        const start=performance.now();const doc=seed(count);const loadMs=performance.now()-start;
        const edit:number[]=[],undo:number[]=[],redo:number[]=[];
        globalThis.gc?.();
        const heapBefore=process.memoryUsage().heapUsed;
        for(let i=0;i<40;i++) {const t=performance.now();useAppStore.getState().pushToHistory();useAppStore.getState().updateNodePosition('n0',i*4,80);edit.push(performance.now()-t);}
        const retained=uniqueSize([...useAppStore.getState().pastStates,{logicalData:useAppStore.getState().logicalData,visualData:useAppStore.getState().visualData}]);
        globalThis.gc?.(); const heapWithHistory=process.memoryUsage().heapUsed;
        for(let i=0;i<30;i++){const t=performance.now();useAppStore.getState().undo();undo.push(performance.now()-t);}
        for(let i=0;i<30;i++){const t=performance.now();useAppStore.getState().redo();redo.push(performance.now()-t);}
        expect(useAppStore.getState().visualData.layoutNodes.n0.x).toBe(156);
        const heapAfter=process.memoryUsage().heapUsed;
        if(run) samples.push({loadMs,editMs:summary(edit),undoMs:summary(undo),redoMs:summary(redo),retained,heapBefore,heapWithHistory,heapAfter,gcAvailable:!!globalThis.gc,serializedDocumentBytes:JSON.stringify(doc).length});
        useAppStore.setState({pastStates:[],futureStates:[]});
      }
      results.push({nodes:count,runs:samples});
    }
    const closeCycles=[];
    function exerciseClose() {seed(250);for(let i=0;i<40;i++){useAppStore.getState().pushToHistory();useAppStore.getState().updateNodePosition('n0',i,80);}useAppStore.setState(initial,true);}
    for(let i=0;i<6;i++){exerciseClose();globalThis.gc?.();closeCycles.push(process.memoryUsage().heapUsed);}
    const report={closeCycles,label:process.env.YADA_MEASURE_LABEL||'current',node:process.version,platform:process.platform,arch:process.arch,method:'1 warmup + 5 runs, 40 committed moves + 30 undo/redo; forced GC before retained heap readings; retained counts are reachable object counts, not byte estimates',results};
    writeFileSync(`performance/2026-10-16/edit-${report.label}.json`,JSON.stringify(report,null,2));
    console.log(JSON.stringify(report));
  } finally { useAppStore.setState(initial,true); }
},30000);
