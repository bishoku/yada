/** Local acceptance uses the complete product canvas and its actual event handlers. */
import React,{useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import '../../src/index.css';
import {DiagramCanvas} from '../../src/components/canvas/DiagramCanvas';
import {setDiagramDataInStore,useAppStore} from '../../src/store/useAppStore';
function reset(){
 setDiagramDataInStore({schemaVersion:2,nodes:[{id:'a',type:'server',name:'Service A'},{id:'b',type:'gateway',name:'Service B'},{id:'c',type:'freeform',name:'Freeform C'},{id:'group',type:'section',name:'Group'}],edges:[{id:'edge-original',sourceId:'a',targetId:'b',isAsync:false,protocol:'gRPC',description:'Keep this flow'}],sequences:[{id:'step-original',edgeId:'edge-original',stepNumber:1,isAsync:false,isRoundTrip:true}]},
 {canvas:{zoom:1,pan:{x:0,y:0}},layoutNodes:{a:{id:'a',x:80,y:80,width:200,height:64},b:{id:'b',x:560,y:80,width:200,height:64},c:{id:'c',x:560,y:280,width:200,height:64},group:{id:'group',x:80,y:350,width:240,height:90}},layoutEdges:{'edge-original':{id:'edge-original',sourceHandle:'right:50',targetHandle:'left:50',color:'#6366f1'}},timelines:{'step-original':{sequenceId:'step-original',duration:1250,delay:75,internalProcess:{duration:250,text:'Work'}}}});
 useAppStore.setState({isPlaying:false,isReadOnly:false,language:'tr',theme:'light',pastStates:[],futureStates:[],activeNodeProperties:null,activeEdgeProperties:null});
}
function Fixture(){
 const state=useAppStore();useEffect(reset,[]);
 const data={edges:state.logicalData.edges,ports:state.visualData.layoutEdges,steps:state.logicalData.sequences,timing:state.visualData.timelines,history:state.pastStates.length,redo:state.futureStates.length,newEditor:!!state.activeEdgeProperties?.isNew};
 return <div style={{height:'100dvh',display:'flex',flexDirection:'column',background:'#f8fafc'}}>
  <div style={{height:124,minHeight:124,overflow:'auto',padding:8,fontSize:11}}>
   <button onClick={reset}>Reset</button> <button onClick={state.undo}>Undo</button> <button onClick={state.redo}>Redo</button> <button onClick={()=>useAppStore.setState({isReadOnly:!state.isReadOnly})}>Readonly {String(state.isReadOnly)}</button>
   <select aria-label="Language" value={state.language} onChange={e=>useAppStore.setState({language:e.target.value as 'en'|'tr'})}><option>tr</option><option>en</option></select>
   <output aria-label="Document state" style={{display:'block',whiteSpace:'pre-wrap'}}>{JSON.stringify(data)}</output>
  </div>
  <div style={{flex:1,minHeight:0}}><DiagramCanvas/></div>
 </div>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
