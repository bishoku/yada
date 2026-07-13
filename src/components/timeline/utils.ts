export const getOptimalTickInterval = (pxPerMs: number): number => {
  const minSpacingPx = 65; // minimum pixels between ticks
  const possibleIntervals = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 30000, 60000];
  for (const interval of possibleIntervals) {
    if (interval * pxPerMs >= minSpacingPx) {
      return interval;
    }
  }
  return 60000;
};
