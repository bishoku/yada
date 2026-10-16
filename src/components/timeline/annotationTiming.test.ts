import { afterEach, expect, it } from 'vitest';
import { annotationTimingFromDrag,commitAnnotationTiming } from './annotationTiming';
import { useAppStore,setDiagramDataInStore } from '../../store/useAppStore';
import { createStarterDiagram } from '../../features/onboarding/starterDiagram';
import type { StickyNote } from '../../types';
const original=useAppStore.getState();
afterEach(()=>useAppStore.setState(original,true));
const note:StickyNote={id:'note',header:'İstek',body:'User content',startTime:200,endTime:1000,style:{backgroundColor:'#fff',borderColor:'#aaa',textColor:'#111',fontFamily:'Outfit',fontSize:12,borderRadius:8,opacity:1}};
function prepare(){const doc=createStarterDiagram('tr');setDiagramDataInStore(doc.logicalData,{...doc.visualData,annotations:{note}},false);useAppStore.setState({pastStates:[],futureStates:[],isReadOnly:false,isPlaying:false});return doc.logicalData;}
it('snaps annotation gestures and clamps bounds without mutating the initial note',()=>{
  expect(annotationTimingFromDrag(note,101,1,'move')).toEqual({startTime:300,endTime:1100});
  expect(annotationTimingFromDrag(note,-500,1,'move')).toEqual({startTime:0,endTime:800});
  expect(annotationTimingFromDrag(note,5000,1,'left')).toEqual({startTime:900,endTime:1000});
  expect(annotationTimingFromDrag(note,-5000,1,'right')).toEqual({startTime:200,endTime:300});
  expect(note.startTime).toBe(200);
});
it('commits a gesture as one undo point and restores it through undo/redo',()=>{
  const doc=prepare();let preview={startTime:note.startTime,endTime:note.endTime};
  for(let i=0;i<80;i++)preview=annotationTimingFromDrag(note,i*2,1,'move');
  expect(useAppStore.getState().pastStates).toHaveLength(0);
  expect(commitAnnotationTiming('note',preview,note,doc)).toBe(true);
  expect(useAppStore.getState().pastStates).toHaveLength(1);
  useAppStore.getState().undo();expect(useAppStore.getState().visualData.annotations!.note).toEqual(note);
  useAppStore.getState().redo();expect(useAppStore.getState().visualData.annotations!.note.startTime).toBe(preview.startTime);
});
it('rejects no-ops, invalid values, changed notes, read-only state and playback',()=>{
  const doc=prepare();expect(commitAnnotationTiming('note',note,note,doc)).toBe(false);
  expect(commitAnnotationTiming('note',{startTime:-1,endTime:500},note,doc)).toBe(false);
  for(const blocked of [{isReadOnly:true},{isPlaying:true}]){useAppStore.setState(blocked);expect(commitAnnotationTiming('note',{startTime:300,endTime:1100},note,doc)).toBe(false);useAppStore.setState({isReadOnly:false,isPlaying:false});}
  useAppStore.setState({visualData:{...useAppStore.getState().visualData,annotations:{note:{...note,body:'Concurrent edit'}}}});
  expect(commitAnnotationTiming('note',{startTime:300,endTime:1100},note,doc)).toBe(false);
  expect(useAppStore.getState().pastStates).toHaveLength(0);
});
