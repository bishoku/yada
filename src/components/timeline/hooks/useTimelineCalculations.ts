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
}

export interface TimelineCalculations {
  maxTime: number;
  pxPerMs: number;
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
  const maxTime = useMemo(() => {
    const sequenceMap = new Map<string, SequenceStep>();
    for (const seq of logicalData.sequences) {
      sequenceMap.set(seq.id, seq);
    }

    let calculatedMax = 2000;
    for (const [seqId, schedule] of Object.entries(schedules)) {
      const seq = sequenceMap.get(seqId);
      const timing = visualData.timelines[seqId];
      const tooltipDur = (!seq?.isRoundTrip && timing?.internalProcess)
        ? (timing.internalProcess.duration ?? 0)
        : 0;
      const totalEnd = schedule.end + tooltipDur;
      if (totalEnd > calculatedMax) {
        calculatedMax = totalEnd;
      }
    }
    return calculatedMax;
  }, [schedules, logicalData.sequences, visualData.timelines]);

  // Dynamic scale (pixels per millisecond) with 24px right padding
  const pxPerMs = useMemo(() => {
    return Math.max(0.0001, (rightPanelWidth - 24) / maxTime);
  }, [rightPanelWidth, maxTime]);

  return {
    maxTime,
    pxPerMs,
    sortedSequences,
    nodeMap,
    edgeMap,
  };
};
