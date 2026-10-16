import type { StickyNote, LogicalDiagram } from '../../types';
import { useAppStore } from '../../store/useAppStore';
export type AnnotationTiming={startTime:number;endTime:number};
export type AnnotationGesture='move'|'left'|'right';
export function annotationTimingFromDrag(initial:AnnotationTiming,deltaPx:number,scale:number,kind:AnnotationGesture):AnnotationTiming {
  if(!Number.isFinite(scale)||scale<=0)return initial;
  const delta=Math.round(deltaPx/scale/50)*50;
  if(!delta)return initial;
  if(kind==='move'){const startTime=Math.max(0,initial.startTime+delta);return {startTime,endTime:startTime+Math.max(100,initial.endTime-initial.startTime)};}
  if(kind==='left'){const endTime=Math.max(100,initial.endTime);return {startTime:Math.min(endTime-100,Math.max(0,initial.startTime+delta)),endTime};}
  return {startTime:Math.max(0,initial.startTime),endTime:Math.max(initial.startTime+100,initial.endTime+delta)};
}
export function commitAnnotationTiming(id:string,timing:AnnotationTiming,expected:StickyNote,document:LogicalDiagram):boolean {
  const state=useAppStore.getState();
  if(state.isReadOnly||state.isPlaying||state.logicalData!==document||state.visualData.annotations?.[id]!==expected||expected.alwaysVisible)return false;
  if(!Number.isFinite(timing.startTime)||!Number.isFinite(timing.endTime)||timing.startTime<0||timing.endTime<=timing.startTime)return false;
  if(timing.startTime===expected.startTime&&timing.endTime===expected.endTime)return false;
  state.updateStickyNote(id,timing); // One committed update creates one undo point.
  return true;
}
