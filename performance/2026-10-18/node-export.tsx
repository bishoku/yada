/** Local acceptance fixture. Uses the actual YADA renderer, clock and output pipeline. */
import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ReactFlow,ReactFlowProvider,Background,applyNodeChanges,applyEdgeChanges,type Node,type Edge} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '../../src/index.css';
import {BaseNode} from '../../src/components/canvas/BaseNode';
import {AnimatedEdge} from '../../src/components/canvas/AnimatedEdge';
import {StickyNoteNode} from '../../src/components/canvas/StickyNoteNode';
import {useCanvasSync} from '../../src/components/canvas/hooks/useCanvasSync';
import {setDiagramDataInStore,useAppStore} from '../../src/store/useAppStore';
import {captureCanvasScene,createSceneRenderer,loadSceneImage,type CaptureScene} from '../../src/utils/captureScene';
import {encodeSceneVideo} from '../../src/utils/streamSceneVideo';
import {generateCanvasSceneHtml} from '../../src/utils/canvasSceneHtml';
import {generatePngDataUrl,generateSvgDataUrl} from '../../src/utils/exportMedia';
import {toCanvas} from 'html-to-image';
import {isTauri} from '../../src/services/storage';
import {save} from '@tauri-apps/plugin-dialog';
import {writeFile} from '@tauri-apps/plugin-fs';
import {excludeCaptureElement} from '../../src/utils/capturePolicy';
const nodeTypes={customNode:BaseNode,stickyNoteNode:StickyNoteNode},edgeTypes={customEdge:AnimatedEdge};
function Fixture(){
 const[nodes,setNodes]=useState<Node[]>([]),[edges,setEdges]=useState<Edge[]>([]);
 const[status,setStatus]=useState('Ready'),[metrics,setMetrics]=useState<any>({}),[artifact,setArtifact]=useState(''),[kind,setKind]=useState('');
 const[theme,setTheme]=useState('light'),[particle,setParticle]=useState('dot'),[style,setStyle]=useState('clean');
 const[video,setVideo]=useState(''),[preview,setPreview]=useState('');
 const scene=useRef<CaptureScene|null>(null); const blob=useRef<Blob|null>(null);
 useCanvasSync(setNodes,setEdges);
 useEffect(()=>{
 document.documentElement.lang='tr';
 document.documentElement.className=theme==='light'?'':`dark ${theme==='dark'?'':`theme-${theme}`}`;
 useAppStore.setState({language:'tr',theme:theme as any,isPlaying:false,isReadOnly:false});
 setDiagramDataInStore({schemaVersion:2,nodes:[{id:'a',type:'firewall',name:'Guardrails'},{id:'b',type:'gateway',name:'Inference Gateway'}],edges:[{id:'e',sourceId:'a',targetId:'b',isAsync:false,protocol:'gRPC'}],sequences:[{id:'s',edgeId:'e',stepNumber:6,isAsync:false,isRoundTrip:true}]},
 {canvas:{zoom:1,pan:{x:0,y:0},renderStyle:style as any},layoutNodes:{a:{id:'a',x:160,y:60,width:224,height:60,theme:'rose'},b:{id:'b',x:160,y:230,width:224,height:60,theme:'rose'},note:{id:'note',x:470,y:100,width:200,height:110}},layoutEdges:{e:{id:'e',sourceHandle:'bottom:50',targetHandle:'top:50',arrowEnd:'triangle',particleType:particle as any}},timelines:{s:{sequenceId:'s',duration:1200,delay:0,internalProcess:{text:'İsteği doğrula',duration:300}}},annotations:{note:{id:'note',header:'Zamanlı not',body:'Türkçe / English',startTime:250,endTime:900,alwaysVisible:false,style:{backgroundColor:'#eef2ff',textColor:'#1e293b',borderColor:'#6366f1'}}} as any});
 },[theme,particle,style]);
 const work=async(action:()=>Promise<void>)=>{setStatus('Working');try{await action();setStatus('Done');}catch(error){setStatus(String(error));console.error(error);}};
 const serialize=async(b:Blob,k:string)=>{blob.current=b;setKind(k);const bytes=new Uint8Array(await b.arrayBuffer());let text='';for(let i=0;i<bytes.length;i+=16384)text+=String.fromCharCode(...bytes.subarray(i,i+16384));setArtifact(btoa(text));};
 return <div style={{height:'100dvh',display:'flex',flexDirection:'column',background:theme==='light'?'#f8fafc':'#0f172a',color:theme==='light'?'#1e293b':'#f1f5f9'}}>
 <div style={{display:'flex',flexWrap:'wrap',gap:8,padding:8,height:112,minHeight:112,overflow:'auto',alignContent:'flex-start',flexShrink:0}}>
 <label>Theme<select aria-label="Theme" value={theme} onChange={e=>setTheme(e.target.value)}>{['light','dark','nord','dracula','synthwave','retro'].map(v=><option key={v}>{v}</option>)}</select></label>
 <label>Particle<select aria-label="Particle" value={particle} onChange={e=>setParticle(e.target.value)}>{['dot','arrow','envelope','rest','grpc','ws','graphql','kafka','pkg','sql'].map(v=><option key={v}>{v}</option>)}</select></label>
 <label>Style<select aria-label="Style" value={style} onChange={e=>setStyle(e.target.value)}><option>clean</option><option>sketchy</option></select></label>
 {[0,300,750,1200,1500].map(time=><button key={time} onClick={()=>useAppStore.getState().setCurrentTime(time)}>Seek {time}</button>)}
 <button onClick={()=>work(async()=>{scene.current=await captureCanvasScene('.react-flow',1500,15);setMetrics(scene.current.metrics);const r=await createSceneRenderer(scene.current,scene.current.width,scene.current.height);await r.render(11);setPreview(r.canvas.toDataURL());r.dispose();})}>Capture cached</button>
 <button onClick={()=>work(async()=>{const s=await captureCanvasScene('.react-flow',1500,15,()=>{},false);setMetrics(s.metrics);})}>Capture uncached</button>
 <button onClick={()=>work(async()=>{if(!scene.current)throw Error('Capture first');const result=await encodeSceneVideo(scene.current,'medium',1);await serialize(result.blob,result.format);setVideo(URL.createObjectURL(result.blob));setMetrics({...scene.current.metrics,...result.metrics,bytes:result.blob.size});})}>Encode video</button>
 <button onClick={()=>work(async()=>{if(!scene.current)throw Error('Capture first');const result=await encodeSceneVideo(scene.current,'medium',1,()=>{},'recorder');await serialize(result.blob,result.format);setVideo(URL.createObjectURL(result.blob));setMetrics({...scene.current.metrics,...result.metrics,bytes:result.blob.size,engine:'recorder'});})}>Encode fallback</button>
 <button onClick={()=>work(async()=>{if(!blob.current)throw Error('Generate first');if(isTauri()){const path=await save({defaultPath:`yada-export-check.${kind}`,filters:[{name:kind,extensions:[kind]}]});if(path)await writeFile(path,new Uint8Array(await blob.current.arrayBuffer()));}else{const url=URL.createObjectURL(blob.current);const a=document.createElement('a');a.href=url;a.download=`yada-export-check.${kind}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}})}>Save artifact</button>
 <a href="/index.html">Open application</a>
 <output aria-label="Environment">{navigator.userAgent} · native:{String(isTauri())} · WebCodecs:{String(typeof VideoEncoder!=='undefined')} · Recorder:{String(typeof MediaRecorder!=='undefined')}</output>
 <button onClick={()=>work(async()=>{if(!scene.current)throw Error('Capture first');const state=useAppStore.getState();const html=generateCanvasSceneHtml(scene.current,state.logicalData,state.schedules,'tr');await serialize(new Blob([html],{type:'text/html'}),'html');})}>HTML TR</button>
 <button onClick={()=>work(async()=>{if(!scene.current)throw Error('Capture first');const state=useAppStore.getState();const html=generateCanvasSceneHtml(scene.current,state.logicalData,state.schedules,'en');await serialize(new Blob([html],{type:'text/html'}),'html');})}>HTML EN</button>
 <button onClick={()=>work(async()=>{const svg=await generateSvgDataUrl('.react-flow',false);setPreview(svg);await serialize(new Blob([decodeURIComponent(svg.split(',').slice(1).join(','))],{type:'image/svg+xml'}),'svg');})}>SVG</button>
 <button onClick={()=>work(async()=>{const png=await generatePngDataUrl('.react-flow',false);setPreview(png);await serialize(await (await fetch(png)).blob(),'png');})}>PNG</button>
 <button onClick={()=>work(async()=>{if(!scene.current)throw Error('Capture first');const s=scene.current;const r=await createSceneRenderer(s,s.width,s.height);const index=11;useAppStore.getState().setCurrentTime(s.frames[index].time);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const expected=await toCanvas(document.querySelector('.react-flow') as HTMLElement,{pixelRatio:1,backgroundColor:s.color,filter:node=>!excludeCaptureElement(node as HTMLElement)});const actual=await r.render(index);const x=expected.getContext('2d')!.getImageData(0,0,s.width,s.height).data,y=actual.getContext('2d')!.getImageData(0,0,s.width,s.height).data;let error=0;for(let i=0;i<x.length;i++)if(i%4!==3)error+=(x[i]-y[i])**2;const mse=error/(s.width*s.height*3);setMetrics({mse,psnr:10*Math.log10(255*255/Math.max(.00001,mse)),frames:s.frames.length,backgrounds:s.backgrounds.length,sprites:s.sprites.length});r.dispose();})}>Compare DOM</button>
 <button onClick={()=>work(async()=>{if(!scene.current)throw Error('Capture first');const s=scene.current;const element=document.querySelector('video')!;if(element.readyState<2)await new Promise(resolve=>element.addEventListener('loadeddata',resolve,{once:true}));const wait=new Promise(resolve=>element.addEventListener('seeked',resolve,{once:true}));element.currentTime=.75;await wait;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const actual=document.createElement('canvas');actual.width=element.videoWidth;actual.height=element.videoHeight;actual.getContext('2d')!.drawImage(element,0,0);const r=await createSceneRenderer(s,actual.width,actual.height);const expected=await r.render(11);const x=expected.getContext('2d')!.getImageData(0,0,actual.width,actual.height).data,y=actual.getContext('2d')!.getImageData(0,0,actual.width,actual.height).data;let error=0;for(let i=0;i<x.length;i++)if(i%4!==3)error+=(x[i]-y[i])**2;const mse=error/(actual.width*actual.height*3);setMetrics({mse,psnr:10*Math.log10(255*255/Math.max(.00001,mse)),duration:element.duration,width:element.videoWidth,height:element.videoHeight});r.dispose();})}>Compare video</button>
 <output aria-label="Status">{status}</output><output aria-label="Metrics">{JSON.stringify(metrics)}</output><output aria-label="Artifact kind">{kind}</output>
 </div>
 <textarea aria-label="Artifact data" value={artifact} readOnly style={{display:'none'}}/>
 <div style={{flex:1,minHeight:0}}><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} reconnectRadius={12} onNodesChange={changes=>setNodes(n=>applyNodeChanges(changes,n))} onEdgesChange={changes=>setEdges(e=>applyEdgeChanges(changes,e))}><Background/></ReactFlow></div>
 <details style={{position:'absolute',right:8,bottom:8,zIndex:100,background:'#fff',color:'#1e293b',maxHeight:320,overflow:'auto'}}><summary>Output preview</summary>{preview&&<img alt="Captured canvas" src={preview} style={{maxWidth:'100%',maxHeight:300}}/>}{video&&<video aria-label="Encoded video" controls src={video} style={{maxWidth:'100%',maxHeight:300}}/>}</details>
 </div>;
}
const root=createRoot(document.getElementById('root')!);root.render(<ReactFlowProvider><Fixture/></ReactFlowProvider>);if(import.meta.hot)import.meta.hot.dispose(()=>root.unmount());
