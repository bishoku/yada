/** Local acceptance fixture: actual YADA renderers, paths, ports and scheduler. Not a product entry point. */
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ReactFlow, ReactFlowProvider, Background, applyEdgeChanges, applyNodeChanges, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '../../src/index.css';
import { AnimatedEdge } from '../../src/components/canvas/AnimatedEdge';
import { BaseNode } from '../../src/components/canvas/BaseNode';
import { useCanvasSync } from '../../src/components/canvas/hooks/useCanvasSync';
import { setDiagramDataInStore, useAppStore } from '../../src/store/useAppStore';
import type { EdgeArrowType, EdgeConnectionType } from '../../src/types';
const nodeTypes = { customNode: BaseNode }, edgeTypes = { customEdge: AnimatedEdge };
const cases = {
  vertical: { a: [160, 60], b: [160, 185], source: 'bottom:50', target: 'top:50' },
  tight: { a: [70, 40], b: [180, 140], source: 'bottom:50', target: 'top:50' },
  diagonal: { a: [70, 40], b: [420, 250], source: 'bottom:50', target: 'top:50' },
  horizontal: { a: [70, 160], b: [480, 160], source: 'right:50', target: 'left:50' },
  reverse: { a: [450, 250], b: [70, 60], source: 'top:50', target: 'bottom:50' },
  loop: { a: [220, 180], b: [650, 300], source: 'right:50', target: 'right:50' },
};
function Fixture() {
  const [scenario, setScenario] = useState<keyof typeof cases>('vertical');
  const [style, setStyle] = useState<'clean'|'sketchy'>('clean');
  const [route, setRoute] = useState<EdgeConnectionType>('bezier');
  const [arrow, setArrow] = useState<EdgeArrowType>('triangle');
  const [theme, setTheme] = useState('light');
  const [ready, setReady] = useState(false);
  const [waypoints, setWaypoints] = useState(false);
  const [nodes, setNodes] = useState<Node[]>([]), [edges, setEdges] = useState<Edge[]>([]);
  useCanvasSync(setNodes, setEdges);
  useEffect(() => {
    setReady(false);
    let second = 0;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setReady(true)); });
    const c = cases[scenario];
    useAppStore.setState({ theme: theme as any, language: 'en', isPlaying: false, isReadOnly: false, selectedSequenceId: null });
    document.documentElement.classList.toggle('dark', theme !== 'light');
    document.documentElement.classList.remove('theme-nord','theme-dracula','theme-synthwave','theme-retro');
    if (!['light','dark'].includes(theme)) document.documentElement.classList.add(`theme-${theme}`);
    setDiagramDataInStore({ schemaVersion: 2,
      nodes: [{ id: 'a', type: 'firewall', name: 'Guardrails' }, { id: 'b', type: 'gateway', name: 'Inference Gateway' }],
      edges: [{ id: 'e', sourceId: 'a', targetId: scenario === 'loop' ? 'a' : 'b', isAsync: false, protocol: 'gRPC', description: 'Request' }],
      sequences: [{ id: 's', edgeId: 'e', stepNumber: 6, isAsync: false, isRoundTrip: true }],
    }, { canvas: { zoom: 1, pan: {x:0,y:0}, renderStyle: style },
      layoutNodes: { a: { id:'a', x:c.a[0],y:c.a[1],width:220,height:60,theme:'rose' }, b: { id:'b',x:c.b[0],y:c.b[1],width:220,height:60,theme:'rose' } },
      layoutEdges: { e: {id:'e',sourceHandle:c.source,targetHandle:c.target,arrowStart:arrow,arrowEnd:arrow,connectionType:route,waypoints:waypoints?[{x:340,y:150},{x:350,y:210}]:undefined} },
      timelines:{s:{sequenceId:'s',duration:1200,delay:0}},
    });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [scenario, style, route, arrow, theme, waypoints]);
  return <div style={{height:'100dvh',display:'flex',flexDirection:'column',background:theme==='light'?'#f8fafc':'#0f172a',color:theme==='light'?'#1e293b':'#f1f5f9'}}>
    <style>{'.react-flow__node { transition: none !important; }'}</style>
    <output data-ready={ready?'true':'false'} style={{display:'none'}}>{scenario}</output>
    <div style={{display:'flex',gap:12,padding:12,flexWrap:'wrap'}}>
      <label>Case <select aria-label="Case" value={scenario} onChange={e=>setScenario(e.target.value as any)}>{Object.keys(cases).map(c=><option key={c}>{c}</option>)}</select></label>
      <label>Style <select aria-label="Style" value={style} onChange={e=>setStyle(e.target.value as any)}><option>clean</option><option>sketchy</option></select></label>
      <label>Route <select aria-label="Route" value={route} onChange={e=>setRoute(e.target.value as any)}>{['bezier','straight','smoothstep','step'].map(c=><option key={c}>{c}</option>)}</select></label>
      <label>Arrow <select aria-label="Arrow" value={arrow} onChange={e=>setArrow(e.target.value as any)}>{['triangle','open','diamond','circle','none'].map(c=><option key={c}>{c}</option>)}</select></label>
      <label>Theme <select aria-label="Theme" value={theme} onChange={e=>setTheme(e.target.value)}>{['light','dark','nord','dracula','synthwave','retro'].map(c=><option key={c}>{c}</option>)}</select></label>
      <label><input aria-label="Waypoints" type="checkbox" checked={waypoints} onChange={e=>setWaypoints(e.target.checked)}/> Waypoints</label>
      <button onClick={()=>useAppStore.getState().setCurrentTime(300)}>Seek 300 ms</button><button onClick={()=>useAppStore.getState().setCurrentTime(600)}>Seek 600 ms</button>
    </div>
    <div style={{flex:1,minHeight:0}}><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} reconnectRadius={12}
      onNodesChange={changes=>setNodes(n=>applyNodeChanges(changes,n))} onEdgesChange={changes=>setEdges(e=>applyEdgeChanges(changes,e))}
      onReconnect={(old,connection)=>useAppStore.getState().reconnectEdge(old.id,connection.source!,connection.target!,(connection.sourceHandle??'right:50').split('-')[0],(connection.targetHandle??'left:50').split('-')[0])}>
      <Background /></ReactFlow></div>
  </div>;
}
const root = createRoot(document.getElementById('root')!);
root.render(<ReactFlowProvider><Fixture/></ReactFlowProvider>);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
