import { SequenceStep, TimelineTiming } from '../types';

export const calculateSchedules = (
  sequences: SequenceStep[],
  timelines: Record<string, TimelineTiming>
): Record<string, { start: number; end: number }> => {
  const sortedSeqs = [...sequences].sort((a, b) => a.stepNumber - b.stepNumber);
  const schedules: Record<string, { start: number; end: number }> = {};
  
  // Group sequences by stepNumber
  const groups: Record<number, SequenceStep[]> = {};
  sortedSeqs.forEach((seq) => {
    if (!groups[seq.stepNumber]) {
      groups[seq.stepNumber] = [];
    }
    groups[seq.stepNumber].push(seq);
  });

  const stepNumbers = Object.keys(groups).map(Number).sort((a, b) => a - b);
  let groupStartTime = 0;

  stepNumbers.forEach((stepNum) => {
    const groupSeqs = groups[stepNum];
    let maxSyncEnd = groupStartTime;

    groupSeqs.forEach((seq) => {
      const timing = timelines[seq.id] || { sequenceId: seq.id, duration: 1000, delay: 0 };
      const start = groupStartTime + (timing.delay ?? 0);
      const end = start + (timing.duration ?? 1000);
      
      schedules[seq.id] = { start, end };
      
      if (!seq.isAsync) {
        if (end > maxSyncEnd) {
          maxSyncEnd = end;
        }
      }
    });

    // The next step group starts after the last synchronous sequence in this step finishes
    groupStartTime = maxSyncEnd;
  });

  return schedules;
};
