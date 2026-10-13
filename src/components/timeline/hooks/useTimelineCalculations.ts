import { playbackEnd } from '../../../store/playbackModel';
import { timelineScale } from '../timingModel';
import { useMemo } from 'react';
import type { LogicalDiagram, VisualDiagram, SequenceStep, LogicalNode, LogicalEdge } from '../../../types';

export interface ScheduleItem {
  start: number;
  end: number;
}

interface UseTimelineCalculationsProps {
  logicalData: LogicalDiagram;
  visualData: VisualDiagram;
  schedules: Record<string, ScheduleItem>;
  rightPanelWidth: number;
  zoom?: number;
}

export interface TimelineCalculations {
  maxTime: number;
  pxPerMs: number;
  contentWidth: number;
  sortedSequences: SequenceStep[];
  nodeMap: Map<string, LogicalNode>;
  edgeMap: Map<string, LogicalEdge>;
}

/**
 * High-performance memoized calculations for timeline scaling and element lookups.
 * Eliminates repeated O(N x M) searches in render loops with O(1) hash maps.
 */
export const useTimelineCalculations = ({
  logicalData,
  visualData,
  schedules,
  rightPanelWidth,
  zoom = 1,
}: UseTimelineCalculationsProps): TimelineCalculations => {
  // O(1) Node lookup map
  const nodeMap = useMemo(() => {
    const map = new Map<string, LogicalNode>();
    for (const node of logicalData.nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [logicalData.nodes]);

  // O(1) Edge lookup map
  const edgeMap = useMemo(() => {
    const map = new Map<string, LogicalEdge>();
    for (const edge of logicalData.edges) {
      map.set(edge.id, edge);
    }
    return map;
  }, [logicalData.edges]);

  // Pre-sort sequences by stepNumber and id
  const sortedSequences = useMemo(() => {
    return [...logicalData.sequences].sort((a, b) => {
      if (a.stepNumber !== b.stepNumber) {
        return a.stepNumber - b.stepNumber;
      }
      return a.id.localeCompare(b.id);
    });
  }, [logicalData.sequences]);

  // Memoized max simulation time
  const maxTime = useMemo(() => playbackEnd(logicalData.sequences, visualData.timelines, schedules), [schedules, logicalData.sequences, visualData.timelines]);

  // Dynamic scale (pixels per millisecond) with 24px right padding
  const { pxPerMs, contentWidth } = useMemo(() => timelineScale(rightPanelWidth, maxTime, zoom), [rightPanelWidth, maxTime, zoom]);

  return {
    maxTime,
    pxPerMs,
    contentWidth,
    sortedSequences,
    nodeMap,
    edgeMap,
  };
};
