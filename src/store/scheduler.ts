import { SequenceStep, TimelineTiming, LogicalEdge, LogicalNode } from '../types';

export const calculateSchedules = (
  sequences: SequenceStep[],
  timelines: Record<string, TimelineTiming>,
  edges: LogicalEdge[] = [],
  _nodes: LogicalNode[] = []
): Record<string, { start: number; end: number }> => {
  const sortedSeqs = [...sequences].sort((a, b) => a.stepNumber - b.stepNumber);
  const schedules: Record<string, { start: number; end: number }> = {};

  if (sortedSeqs.length === 0) return schedules;

  const edgeMap = new Map(edges.map(e => [e.id, e]));

  // Resolve source/target node IDs for each sequence step
  const seqNodes = new Map<string, { src: string; tgt: string }>();
  sortedSeqs.forEach(seq => {
    const edge = edgeMap.get(seq.edgeId);
    const src = edge ? edge.sourceId : '';
    const tgt = edge ? edge.targetId : '';
    seqNodes.set(seq.id, { src, tgt });
  });

  // Build nesting tree: determine parent for each step
  const childrenOf = new Map<string, SequenceStep[]>();
  const nested = new Set<string>();
  const activeRTTargets = new Map<string, string>(); // nodeId -> round-trip stepId that targets it

  // RT nesting: round-trip steps can have nested children
  sortedSeqs.forEach(seq => {
    const { src } = seqNodes.get(seq.id)!;
    const parentId = src ? activeRTTargets.get(src) : undefined;

    if (parentId) {
      nested.add(seq.id);
      if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
      childrenOf.get(parentId)!.push(seq);
    }

    if (seq.isRoundTrip) {
      const { tgt } = seqNodes.get(seq.id)!;
      if (tgt) activeRTTargets.set(tgt, seq.id);
    }
  });

  // Process a step and all its nested children, return total end time
  function processStep(seq: SequenceStep, startTime: number): number {
    const timing = timelines[seq.id] || { sequenceId: seq.id, duration: 1000, delay: 0 };
    const duration = timing.duration ?? 1000;
    const children = childrenOf.get(seq.id) || [];

    // Simple step (no children, not round-trip)
    if (!seq.isRoundTrip && children.length === 0) {
      schedules[seq.id] = { start: startTime, end: startTime + duration };
      return startTime + duration;
    }

    // Round-trip step (may also have children from RT nesting)
    const halfTransit = duration / 2;
    const forwardReach = startTime + halfTransit;
    const ipDur = timing.internalProcess ? (timing.internalProcess.duration ?? 1000) : 0;

    // Process children grouped by stepNumber for concurrent starts
    const childGroups: Record<number, SequenceStep[]> = {};
    children.forEach(c => {
      if (!childGroups[c.stepNumber]) childGroups[c.stepNumber] = [];
      childGroups[c.stepNumber].push(c);
    });

    let childReadyTime = forwardReach + ipDur;
    let latestSyncEnd = childReadyTime;

    Object.keys(childGroups).map(Number).sort((a, b) => a - b).forEach(gn => {
      const group = childGroups[gn];
      const snapshot = childReadyTime; // snapshot for concurrent starts within group

      group.forEach(child => {
        const childTiming = timelines[child.id] || { sequenceId: child.id, duration: 1000, delay: 0 };
        const childDelay = childTiming.delay ?? 0;
        const childStart = snapshot + childDelay;
        const childEnd = processStep(child, childStart);

        if (!child.isAsync) {
          if (childEnd > childReadyTime) childReadyTime = childEnd;
          if (childEnd > latestSyncEnd) latestSyncEnd = childEnd;
        }
      });
    });

    // Return transit starts after all sync children complete
    const returnStart = latestSyncEnd;
    const totalEnd = returnStart + halfTransit;

    schedules[seq.id] = { start: startTime, end: totalEnd };
    return totalEnd;

  }

  // Process root-level steps grouped by stepNumber.
  //
  // SOURCE-CHAIN DEPENDENCY MODEL
  // ─────────────────────────────
  // Instead of a single global cursor that forces every seq in step N to
  // wait for ALL seqs in step N-1, each seq's start is derived from the
  // latest completion time of seqs that targeted its own source node
  // (i.e. its direct predecessor in the data-flow graph).
  //
  // If no prior seq has targeted a seq's source node, the algorithm falls
  // back to the global floor (= max end of all seqs in the previous step
  // group), preserving the traditional "global barrier" behaviour for
  // chains that have no explicit source dependency.
  //
  // Example where this matters:
  //   Step 1:  Client → Server-A (duration 2000ms)
  //   Step 1:  Client → Gateway-B (duration 1000ms, independent chain)
  //   Step 2:  Gateway-B → Server-C
  //
  // Without source-chain: Gateway-B → Server-C waits for Server-A (t=2000)
  // With source-chain: Gateway-B → Server-C starts at t=1000 (its own predecessor)

  const rootSteps = sortedSeqs.filter(seq => !nested.has(seq.id));
  const rootGroups: Record<number, SequenceStep[]> = {};
  rootSteps.forEach(seq => {
    if (!rootGroups[seq.stepNumber]) rootGroups[seq.stepNumber] = [];
    rootGroups[seq.stepNumber].push(seq);
  });

  // nodeEndTime[nodeId] = latest end-time of any root-level (non-async) seq
  // that has *targeted* this node. Updated as seqs are processed.
  const nodeEndTime = new Map<string, number>();

  // Global floor: falls back to max-sync-end of the previous step group
  // for seqs that have no direct source-chain predecessor.
  let globalFloor = 0;

  Object.keys(rootGroups).map(Number).sort((a, b) => a - b).forEach(gn => {
    const group = rootGroups[gn];
    let maxSyncEnd = globalFloor;

    group.forEach(seq => {
      const { src, tgt } = seqNodes.get(seq.id)!;
      const timing = timelines[seq.id] || { sequenceId: seq.id, duration: 1000, delay: 0 };
      const delay = timing.delay ?? 0;

      // Primary: use the end-time of the seq that most recently targeted this
      // seq's source node (source-chain dependency).
      // Fallback: global floor, so seqs with no direct predecessor still
      // respect the step-number ordering barrier.
      const sourceChainEnd = nodeEndTime.get(src); // undefined ⟹ no predecessor
      const baseStart = sourceChainEnd !== undefined ? sourceChainEnd : globalFloor;
      const startTime = baseStart + delay;

      const totalEnd = processStep(seq, startTime);

      // Record when the target node becomes "ready" for subsequent seqs.
      if (!seq.isAsync && tgt) {
        nodeEndTime.set(tgt, Math.max(nodeEndTime.get(tgt) ?? 0, totalEnd));
      }

      if (!seq.isAsync && totalEnd > maxSyncEnd) {
        maxSyncEnd = totalEnd;
      }
    });

    // Advance the global floor to the max sync-end of this step group.
    // Seqs in the next group that have no direct source-chain predecessor
    // will start from here.
    globalFloor = maxSyncEnd;
  });

  return schedules;
};

export interface NodeScheduleItem {
  seqId: string;
  stepNumber: number;
  start: number;
  end: number;
  isSource: boolean;
  isTarget: boolean;
  isRoundTrip: boolean;
  duration: number;
  internalProcess?: { text: string; duration: number };
}

export const deriveTopologyIndices = (
  logicalNodes: LogicalNode[] = [],
  edges: LogicalEdge[] = [],
  layoutEdges: Record<string, { sourceHandle?: string; targetHandle?: string }> = {},
  sequences: SequenceStep[] = [],
  timelines: Record<string, TimelineTiming> = {},
  schedules: Record<string, { start: number; end: number }> = {}
): {
  connectedPortsByNode: Record<string, string[]>;
  nodeSchedules: Record<string, NodeScheduleItem[]>;
} => {
  const connectedPortsByNode: Record<string, string[]> = {};
  const portsSetByNode = new Map<string, Set<string>>();

  logicalNodes.forEach((n) => {
    portsSetByNode.set(n.id, new Set<string>());
  });

  edges.forEach((e) => {
    const ve = layoutEdges[e.id];
    if (ve?.sourceHandle) {
      if (!portsSetByNode.has(e.sourceId)) portsSetByNode.set(e.sourceId, new Set());
      portsSetByNode.get(e.sourceId)!.add(ve.sourceHandle);
    }
    if (ve?.targetHandle) {
      if (!portsSetByNode.has(e.targetId)) portsSetByNode.set(e.targetId, new Set());
      portsSetByNode.get(e.targetId)!.add(ve.targetHandle);
    }
  });

  portsSetByNode.forEach((set, nodeId) => {
    connectedPortsByNode[nodeId] = Array.from(set).sort();
  });

  const nodeSchedules: Record<string, NodeScheduleItem[]> = {};
  const edgeMap = new Map(edges.map((e) => [e.id, e]));

  sequences.forEach((seq) => {
    const edge = edgeMap.get(seq.edgeId);
    if (!edge) return;
    const sched = schedules[seq.id];
    if (!sched) return;

    const timing = timelines[seq.id];
    const duration = timing?.duration ?? 1000;
    const internalProcess = timing?.internalProcess;
    const isRoundTrip = !!seq.isRoundTrip;

    const item: NodeScheduleItem = {
      seqId: seq.id,
      stepNumber: seq.stepNumber,
      start: sched.start,
      end: sched.end,
      isSource: false,
      isTarget: false,
      isRoundTrip,
      duration,
      internalProcess: internalProcess
        ? { text: internalProcess.text, duration: internalProcess.duration ?? 1000 }
        : undefined,
    };

    if (edge.sourceId) {
      if (!nodeSchedules[edge.sourceId]) nodeSchedules[edge.sourceId] = [];
      nodeSchedules[edge.sourceId].push({ ...item, isSource: true });
    }

    if (edge.targetId && edge.targetId !== edge.sourceId) {
      if (!nodeSchedules[edge.targetId]) nodeSchedules[edge.targetId] = [];
      nodeSchedules[edge.targetId].push({ ...item, isTarget: true });
    } else if (edge.targetId === edge.sourceId && edge.sourceId) {
      const existing = nodeSchedules[edge.sourceId];
      if (existing && existing.length > 0) {
        existing[existing.length - 1].isTarget = true;
      }
    }
  });

  return { connectedPortsByNode, nodeSchedules };
};
