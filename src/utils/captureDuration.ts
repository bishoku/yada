import { playbackEnd } from '../store/playbackModel';
import type { LogicalDiagram, VisualDiagram } from '../types';
export function canvasCaptureDuration(logical: LogicalDiagram, visual: VisualDiagram, schedules: Record<string,{start:number;end:number}>) {
  const notes = Object.values(visual.annotations ?? {}).filter(note=>!note.alwaysVisible).map(note=>Number.isFinite(note.endTime)?note.endTime:0);
  return Math.max(playbackEnd(logical.sequences,visual.timelines,schedules),...notes)+500;
}
