import { useEffect, useState, useMemo, RefObject } from 'react';
import { useAppStore } from '../../../store/useAppStore';
export const useEdgeAnimation = (
  edgeId: string, 
  pathRef: RefObject<SVGPathElement | null>,
  particleRefs: RefObject<SVGGElement | null>[]
) => {
  const logicalData = useAppStore((s) => s.logicalData);
  const selectedSequenceId = useAppStore((s) => s.selectedSequenceId);

  const [isAnimating, setIsAnimating] = useState(false);
  const [activeStepNumber, setActiveStepNumber] = useState<number | null>(null);

  const seqsForEdge = useMemo(() => logicalData.sequences.filter((s) => s.edgeId === edgeId), [logicalData.sequences, edgeId]);
  const isSelected = useMemo(() => seqsForEdge.some((s) => s.id === selectedSequenceId), [seqsForEdge, selectedSequenceId]);
  const isAsync = useMemo(() => seqsForEdge.some((s) => s.isAsync), [seqsForEdge]);

  useEffect(() => {
    const unsub = useAppStore.subscribe((state, prevState) => {
      const currentTime = state.currentTime;
      // Skip redundant checks if time hasn't changed and data hasn't changed
      if (currentTime === prevState.currentTime && 
          state.logicalData === prevState.logicalData && 
          state.visualData === prevState.visualData) {
        return;
      }

      const schedules = state.schedules;

      let activeSeq = null;
      for (const seq of seqsForEdge) {
        const sched = schedules[seq.id];
        if (!sched) continue;
        const timing = state.visualData.timelines[seq.id];
        const effectiveMode = timing?.animationMode ?? (seq.isRoundTrip ? 'roundTrip' : 'normal');

        if (effectiveMode === 'repeat') {
          // Repeat mode: starts at step start, continues until entire timeline ends
          if (currentTime >= sched.start) {
            // Find the global timeline end (max of all schedule end times)
            let timelineEnd = sched.end;
            for (const key in schedules) {
              if (schedules[key].end > timelineEnd) timelineEnd = schedules[key].end;
            }
            if (currentTime <= timelineEnd) {
              activeSeq = seq;
              break;
            }
          }
        } else {
          // Normal / RoundTrip: only active during step's own window
          if (currentTime >= sched.start && currentTime <= sched.end) {
            activeSeq = seq;
            break;
          }
        }
      }

      const newIsAnimating = !!activeSeq;
      setIsAnimating((prev) => {
        if (prev !== newIsAnimating) return newIsAnimating;
        return prev;
      });

      const nextStepNum = activeSeq ? activeSeq.stepNumber : null;
      setActiveStepNumber((prev) => (prev !== nextStepNum ? nextStepNum : prev));

      const hideAllParticles = () => {
        particleRefs.forEach(ref => {
          if (ref.current) ref.current.style.display = 'none';
        });
      };

      const pathEl = pathRef.current;
      if (!pathEl || !newIsAnimating || !activeSeq) {
        hideAllParticles();
        return;
      }

      try {
        const sched = schedules[activeSeq.id];
        if (!sched) {
          hideAllParticles();
          return;
        }

        const timing = state.visualData.timelines[activeSeq.id];
        const stepDuration = timing?.duration ?? 1000;
        const elapsed = currentTime - sched.start;
        const effectiveMode = timing?.animationMode ?? (activeSeq.isRoundTrip ? 'roundTrip' : 'normal');

        const totalLength = pathEl.getTotalLength();
        if (totalLength <= 0) return;

        switch (effectiveMode) {
          case 'repeat': {
            const count = timing?.repeatParticleCount ?? 1;
            const cycleDuration = stepDuration;
            for (let i = 0; i < particleRefs.length; i++) {
              const ref = particleRefs[i];
              if (!ref.current) continue;

              if (i < count) {
                const offset = (i / count) * cycleDuration;
                const particleElapsed = (elapsed - offset) % cycleDuration;
                if (elapsed < offset) {
                  ref.current.style.display = 'none';
                  continue;
                }

                const safeElapsed = particleElapsed < 0 ? particleElapsed + cycleDuration : particleElapsed;
                const progress = Math.max(0, Math.min(1, safeElapsed / cycleDuration));

                const point = pathEl.getPointAtLength(progress * totalLength);
                const p1 = pathEl.getPointAtLength(Math.max(0, progress * totalLength - 1));
                const p2 = pathEl.getPointAtLength(Math.min(totalLength, progress * totalLength + 1));
                const rotation = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);

                ref.current.style.display = 'block';
                ref.current.setAttribute('transform', `translate(${point.x}, ${point.y}) rotate(${rotation})`);
              } else {
                ref.current.style.display = 'none';
              }
            }
            return;
          }

          case 'roundTrip': {
            const transitHalf = stepDuration / 2;
            const returnStartElapsed = (sched.end - sched.start) - transitHalf;
            let actualProgress = 0;

            if (elapsed < transitHalf) {
              actualProgress = Math.min(Math.max(elapsed / transitHalf, 0), 1);
            } else if (elapsed < returnStartElapsed) {
              actualProgress = 1.0;
            } else {
              const returnElapsed = elapsed - returnStartElapsed;
              actualProgress = 1.0 - Math.min(Math.max(returnElapsed / transitHalf, 0), 1);
            }

            const point = pathEl.getPointAtLength(actualProgress * totalLength);
            const p1 = pathEl.getPointAtLength(Math.max(0, actualProgress * totalLength - 1));
            const p2 = pathEl.getPointAtLength(Math.min(totalLength, actualProgress * totalLength + 1));
            const rotation = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);

            for (let i = 0; i < particleRefs.length; i++) {
              const ref = particleRefs[i];
              if (!ref.current) continue;
              if (i === 0) {
                ref.current.style.display = 'block';
                ref.current.setAttribute('transform', `translate(${point.x}, ${point.y}) rotate(${rotation})`);
              } else {
                ref.current.style.display = 'none';
              }
            }
            break;
          }

          case 'normal':
          default: {
            const transitDuration = stepDuration;
            let actualProgress = 0;
            if (elapsed < transitDuration) {
              actualProgress = Math.min(Math.max(elapsed / transitDuration, 0), 1);
            } else {
              actualProgress = 1;
            }

            const point = pathEl.getPointAtLength(actualProgress * totalLength);
            const p1 = pathEl.getPointAtLength(Math.max(0, actualProgress * totalLength - 1));
            const p2 = pathEl.getPointAtLength(Math.min(totalLength, actualProgress * totalLength + 1));
            const rotation = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);

            for (let i = 0; i < particleRefs.length; i++) {
              const ref = particleRefs[i];
              if (!ref.current) continue;
              if (i === 0) {
                ref.current.style.display = 'block';
                ref.current.setAttribute('transform', `translate(${point.x}, ${point.y}) rotate(${rotation})`);
              } else {
                ref.current.style.display = 'none';
              }
            }
            break;
          }
        }
      } catch (err) {
        particleRefs.forEach(ref => {
          if (ref.current) ref.current.style.display = 'none';
        });
      }
    });

    return unsub;
  }, [seqsForEdge, pathRef]);

  return {
    isAnimating,
    isSelected,
    isAsync,
    seqsForEdge,
    activeStepNumber,
  };
};
