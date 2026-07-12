import { SequenceStep, TimelineTiming, LogicalEdge } from '../types';

export const calculateSchedules = (
  sequences: SequenceStep[],
  timelines: Record<string, TimelineTiming>,
  edges: LogicalEdge[] = []
): Record<string, { start: number; end: number }> => {
  const sortedSeqs = [...sequences].sort((a, b) => a.stepNumber - b.stepNumber);
  const schedules: Record<string, { start: number; end: number }> = {};

  if (sortedSeqs.length === 0) return schedules;

  const edgeMap = new Map(edges.map(e => [e.id, e]));

  // Resolve source/target node IDs for each sequence step
  const seqNodes = new Map<string, { src: string; tgt: string }>();
  sortedSeqs.forEach(seq => {
    const edge = edgeMap.get(seq.edgeId);
    const src = edge ? (seq.direction === 'reverse' ? edge.to : edge.from) : '';
    const tgt = edge ? (seq.direction === 'reverse' ? edge.from : edge.to) : '';
    seqNodes.set(seq.id, { src, tgt });
  });

  // Build nesting tree: determine parent for each step
  const childrenOf = new Map<string, SequenceStep[]>();
  const nested = new Set<string>();
  const activeRTTargets = new Map<string, string>(); // nodeId -> round-trip stepId that targets it

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

  // DEBUG: log nesting tree
  console.group('[Scheduler] Nesting Tree');
  sortedSeqs.forEach(seq => {
    const nodes = seqNodes.get(seq.id)!;
    const isRoot = !nested.has(seq.id);
    const children = childrenOf.get(seq.id) || [];
    console.log(
      `S${seq.stepNumber} (${seq.id.slice(0,6)}) ${nodes.src}→${nodes.tgt} RT=${seq.isRoundTrip} async=${seq.isAsync} | ${isRoot ? 'ROOT' : 'NESTED'} | children: [${children.map(c => 'S'+c.stepNumber).join(', ')}]`
    );
  });
  console.groupEnd();

  // Recursive: process a step and all its nested children, return total end time
  function processStep(seq: SequenceStep, startTime: number): number {
    const timing = timelines[seq.id] || { sequenceId: seq.id, duration: 1000, delay: 0 };
    const duration = timing.duration ?? 1000;

    if (!seq.isRoundTrip) {
      schedules[seq.id] = { start: startTime, end: startTime + duration };
      return startTime + duration;
    }

    // Round-trip: forward transit reaches target at halfTransit
    const halfTransit = duration / 2;
    const forwardReach = startTime + halfTransit;
    const ipDur = timing.internalProcess ? (timing.internalProcess.duration ?? 1000) : 0;

    // Process children grouped by stepNumber for concurrent starts
    const children = childrenOf.get(seq.id) || [];
    const childGroups: Record<number, SequenceStep[]> = {};
    children.forEach(c => {
      if (!childGroups[c.stepNumber]) childGroups[c.stepNumber] = [];
      childGroups[c.stepNumber].push(c);
    });

    let childReadyTime = forwardReach;
    let latestSyncEnd = forwardReach;

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

    // Return transit starts after all sync children complete + internal process
    const returnStart = latestSyncEnd + ipDur;
    const totalEnd = returnStart + halfTransit;

    schedules[seq.id] = { start: startTime, end: totalEnd };
    return totalEnd;
  }

  // Process root-level steps grouped by stepNumber
  const rootSteps = sortedSeqs.filter(seq => !nested.has(seq.id));
  const rootGroups: Record<number, SequenceStep[]> = {};
  rootSteps.forEach(seq => {
    if (!rootGroups[seq.stepNumber]) rootGroups[seq.stepNumber] = [];
    rootGroups[seq.stepNumber].push(seq);
  });

  let groupStartTime = 0;

  Object.keys(rootGroups).map(Number).sort((a, b) => a - b).forEach(gn => {
    const group = rootGroups[gn];
    const snapshot = groupStartTime; // snapshot for concurrent root starts within group
    let maxSyncEnd = groupStartTime;

    group.forEach(seq => {
      const timing = timelines[seq.id] || { sequenceId: seq.id, duration: 1000, delay: 0 };
      const delay = timing.delay ?? 0;
      const startTime = snapshot + delay;
      const totalEnd = processStep(seq, startTime);

      if (!seq.isAsync && totalEnd > maxSyncEnd) {
        maxSyncEnd = totalEnd;
      }
    });

    groupStartTime = maxSyncEnd;
  });

  // DEBUG: log final schedules
  console.group('[Scheduler] Final Schedules');
  sortedSeqs.forEach(seq => {
    const s = schedules[seq.id];
    if (s) console.log(`S${seq.stepNumber}: start=${s.start} end=${s.end} (duration=${s.end - s.start})`);
  });
  console.groupEnd();

  return schedules;
};

