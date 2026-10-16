import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { StickyNote, LogicalDiagram } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { annotationTimingFromDrag, commitAnnotationTiming, type AnnotationGesture, type AnnotationTiming } from './annotationTiming';

export function useAnnotationBarDrag(pxPerMs:number,enabled=true) {
  const active=useRef<{id:string;pointerId:number;x:number;scale:number;kind:AnnotationGesture;initial:StickyNote;document:LogicalDiagram;values:AnnotationTiming}|null>(null);
  const [preview,setPreview]=useState<({id:string}&AnnotationTiming)|null>(null);
  useEffect(()=>{if(!enabled){active.current=null;setPreview(null);}},[enabled]);
  useEffect(()=>{
    const cancel=()=>{active.current=null;setPreview(null);};
    const move=(event:PointerEvent)=>{const gesture=active.current;if(!gesture||event.pointerId!==gesture.pointerId)return;
      const state=useAppStore.getState();if(state.isPlaying||state.isReadOnly){cancel();return;}
      gesture.values=annotationTimingFromDrag(gesture.initial,event.clientX-gesture.x,gesture.scale,gesture.kind);
      setPreview({id:gesture.id,...gesture.values});
    };
    const finish=(event:PointerEvent)=>{const gesture=active.current;if(!gesture||event.pointerId!==gesture.pointerId)return;commitAnnotationTiming(gesture.id,gesture.values,gesture.initial,gesture.document);cancel();};
    const pointerCancel=(event:PointerEvent)=>{if(active.current?.pointerId===event.pointerId)cancel();};
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&active.current){event.preventDefault();cancel();}};
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',pointerCancel);window.addEventListener('keydown',key);
    return()=>{active.current=null;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',pointerCancel);window.removeEventListener('keydown',key);};
  },[]);
  const begin=(event:React.PointerEvent,id:string,kind:AnnotationGesture)=>{
    event.stopPropagation();const state=useAppStore.getState(),initial=state.visualData.annotations?.[id];
    if(!enabled||event.button!==0||active.current||state.isReadOnly||state.isPlaying||!initial||initial.alwaysVisible)return;
    event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);
    active.current={id,pointerId:event.pointerId,x:event.clientX,scale:pxPerMs,kind,initial,document:state.logicalData,values:initial};
  };
  return {preview,handleBarMouseDown:(event:React.PointerEvent,id:string)=>begin(event,id,'move'),handleResizeLeftMouseDown:(event:React.PointerEvent,id:string)=>begin(event,id,'left'),handleResizeRightMouseDown:(event:React.PointerEvent,id:string)=>begin(event,id,'right')};
}
