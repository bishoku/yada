import { afterEach, expect, it } from 'vitest';
import { snapshotDocument } from './historySnapshot';
import { useAppStore, setDiagramDataInStore } from './useAppStore';
import { createStarterDiagram } from '../features/onboarding/starterDiagram';
const initial=useAppStore.getState();
afterEach(()=>useAppStore.setState(initial,true));
it('shares defensive copies while detecting mutated external inputs',()=>{
  const doc=createStarterDiagram('tr');
  const first=snapshotDocument(doc.logicalData,doc.visualData);
  const second=snapshotDocument(doc.logicalData,doc.visualData);
  expect(second.visualData.layoutNodes['starter-client']).toBe(first.visualData.layoutNodes['starter-client']);
  expect(second.visualData.layoutNodes['starter-client']).not.toBe(doc.visualData.layoutNodes['starter-client']);
  doc.visualData.layoutNodes['starter-client'].x=99;
  doc.logicalData.nodes[0].name='Changed externally';
  const third=snapshotDocument(doc.logicalData,doc.visualData);
  expect(first.visualData.layoutNodes['starter-client'].x).toBe(0);
  expect(first.logicalData.nodes[0].name).toBe('İstemci');
  expect(third.visualData.layoutNodes['starter-client'].x).toBe(99);
  expect(third.logicalData.nodes[0].name).toBe('Changed externally');
});
it('preserves drawings, canvas preferences and extension data as JSON values',()=>{
  const doc=createStarterDiagram('en');
  const visual={...doc.visualData,annotations:{note:{id:'note',text:'İstek',color:'#fff'}},freehandStrokes:{stroke:{id:'stroke',points:[{x:1,y:2}],tool:'pen',size:3,color:'#fff',opacity:1}},extension:{data:['TR',null]}};
  const snapshot=snapshotDocument(doc.logicalData,visual as unknown as typeof doc.visualData);
  expect(snapshot).toEqual(JSON.parse(JSON.stringify({logicalData:doc.logicalData,visualData:visual})));
  visual.extension.data[0]='edited';visual.freehandStrokes.stroke.points[0].x=42;
  expect((snapshot.visualData as unknown as typeof visual).extension.data[0]).toBe('TR');
  expect(snapshot.visualData.freehandStrokes!.stroke.points[0].x).toBe(1);
});
it('retains 30 undo points, restores timing and discards redo after a new edit',()=>{
  const doc=createStarterDiagram('tr');setDiagramDataInStore(doc.logicalData,doc.visualData,false);
  useAppStore.setState({pastStates:[],futureStates:[]});
  for(let i=1;i<=40;i++){useAppStore.getState().pushToHistory();useAppStore.getState().updateNodePosition('starter-client',i,80);}
  expect(useAppStore.getState().pastStates).toHaveLength(30);
  for(let i=0;i<30;i++)useAppStore.getState().undo();
  expect(useAppStore.getState().visualData.layoutNodes['starter-client'].x).toBe(10);
  expect(useAppStore.getState().visualData.timelines).toEqual(doc.visualData.timelines);
  for(let i=0;i<30;i++)useAppStore.getState().redo();
  expect(useAppStore.getState().visualData.layoutNodes['starter-client'].x).toBe(40);
  useAppStore.getState().undo();useAppStore.getState().pushToHistory();useAppStore.getState().updateNodePosition('starter-client',77,80);
  expect(useAppStore.getState().futureStates).toHaveLength(0);
  useAppStore.getState().undo();expect(useAppStore.getState().visualData.layoutNodes['starter-client'].x).toBe(39);
  expect(useAppStore.getState().isDirty).toBe(true);
});
