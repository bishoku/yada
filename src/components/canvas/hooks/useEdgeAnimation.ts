import { sampleCubicPath, pointAtProgress, type PathSample } from './pathSampling';
import { getEdgeTopology, EMPTY_EDGE_SEQUENCES } from './edgeTopology';
import { useEffect, useState, useMemo, useRef, RefObject } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { simulationClock } from '../../../store/simulationClock';
import { maximumTimelineEnd } from './sectionPlayback';

const SAMPLE_COUNT = 128;

function samplePath(pathEl: SVGPathElement): PathSample[] {
  const cubic = sampleCubicPath(pathEl.getAttribute('d') ?? '');
  if (cubic) return cubic;
  try {
    const totalLength = pathEl.getTotalLength();
    if (totalLength <= 0) return [];
    const samples: PathSample[] = [];
    const step = totalLength / (SAMPLE_COUNT - 1);

    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const len = i * step;
      const pt = pathEl.getPointAtLength(len);
      const nextPt = pathEl.getPointAtLength(Math.min(totalLength, len + 1));
      const angle = Math.atan2(nextPt.y - pt.y, nextPt.x - pt.x) * (180 / Math.PI);
      samples.push({ x: pt.x, y: pt.y, angle, progress: i / (SAMPLE_COUNT - 1) });
    }
    return samples;
  } catch {
    return [];
  }
}

export const useEdgeAnimation = (
  edgeId: string, 
  pathRef: RefObject<SVGPathElement | null>,
  particleRefs: RefObject<SVGGElement | null>[]
) => {
  const logicalData = useAppStore((s) => s.logicalData);
  const selectedSequenceId = useAppStore((s) => s.selectedSequenceId);

  const [isAnimating, setIsAnimating] = useState(false);
  const [activeStepNumber, setActiveStepNumber] = useState<number | null>(null);
  const pathSamples = useRef<{ d: string; samples: PathSample[] }>({ d: '', samples: [] });

  const seqsForEdge = getEdgeTopology(logicalData.edges, logicalData.sequences).sequencesByEdge.get(edgeId) ?? EMPTY_EDGE_SEQUENCES;
  const isSelected = useMemo(() => seqsForEdge.some((s) => s.id === selectedSequenceId), [seqsForEdge, selectedSequenceId]);
  const isAsync = useMemo(() => seqsForEdge.some((s) => s.isAsync), [seqsForEdge]);

  useEffect(() => {
    let lastPathD = pathSamples.current.d;
    let cachedSamples: PathSample[] = pathSamples.current.samples;
    let cachedMaxTimelineEnd = 0;
    let lastSchedulesRef: Record<string, { start: number; end: number }> | null = null;
    let particlesHidden = false;
    let previousAnimating: boolean | undefined;
    let previousStep: number | null | undefined;

    const hideAllParticles = () => {
      if (particlesHidden) return;
      particlesHidden = true;
      particleRefs.forEach(ref => {
        if (ref.current) ref.current.style.display = 'none';
      });
    };

    const updateFrame = (currentTime: number) => {
      const state = useAppStore.getState();
      const schedules = state.schedules;
      const visualData = state.visualData;

      if (schedules !== lastSchedulesRef) {
        lastSchedulesRef = schedules;
        cachedMaxTimelineEnd = maximumTimelineEnd(schedules);
      }

      let activeSeq = null;
      for (const seq of seqsForEdge) {
        const sched = schedules[seq.id];
        if (!sched) continue;
        const timing = visualData.timelines[seq.id];
        const effectiveMode = timing?.animationMode ?? (seq.isRoundTrip ? 'roundTrip' : 'normal');

        if (effectiveMode === 'repeat') {
          if (currentTime >= sched.start && currentTime <= cachedMaxTimelineEnd) {
            activeSeq = seq;
            break;
          }
        } else {
          if (currentTime >= sched.start && currentTime <= sched.end) {
            activeSeq = seq;
            break;
          }
        }
      }

      const newIsAnimating = !!activeSeq;
      if (previousAnimating !== newIsAnimating) {
        previousAnimating = newIsAnimating;
        setIsAnimating(newIsAnimating);
      }

      const nextStepNum = activeSeq ? activeSeq.stepNumber : null;
      if (previousStep !== nextStepNum) {
        previousStep = nextStepNum;
        setActiveStepNumber(nextStepNum);
      }

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

        const timing = visualData.timelines[activeSeq.id];
        const stepDuration = timing?.duration ?? 1000;
        const elapsed = currentTime - sched.start;
        const effectiveMode = timing?.animationMode ?? (activeSeq.isRoundTrip ? 'roundTrip' : 'normal');

        const currentD = pathEl.getAttribute('d') || '';
        if (currentD !== lastPathD || cachedSamples.length === 0) {
          lastPathD = currentD;
          cachedSamples = samplePath(pathEl);
          pathSamples.current = { d: currentD, samples: cachedSamples };
        }

        if (cachedSamples.length === 0) {
          hideAllParticles();
          return;
        }

        particlesHidden = false;
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
                const { x, y, angle } = pointAtProgress(cachedSamples, progress);

                ref.current.style.display = 'block';
                ref.current.setAttribute('transform', `translate(${x}, ${y}) rotate(${angle})`);
                ref.current.querySelector('[data-particle-upright]')?.setAttribute('transform', `rotate(${-angle})`);
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

            const { x, y, angle } = pointAtProgress(cachedSamples, actualProgress);
            const travelAngle = elapsed >= returnStartElapsed ? angle + 180 : angle;

            for (let i = 0; i < particleRefs.length; i++) {
              const ref = particleRefs[i];
              if (!ref.current) continue;
              if (i === 0) {
                ref.current.style.display = 'block';
                ref.current.setAttribute('transform', `translate(${x}, ${y}) rotate(${travelAngle})`);
                ref.current.querySelector('[data-particle-upright]')?.setAttribute('transform', `rotate(${-travelAngle})`);
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

            const { x, y, angle } = pointAtProgress(cachedSamples, actualProgress);

            for (let i = 0; i < particleRefs.length; i++) {
              const ref = particleRefs[i];
              if (!ref.current) continue;
              if (i === 0) {
                ref.current.style.display = 'block';
                ref.current.setAttribute('transform', `translate(${x}, ${y}) rotate(${angle})`);
                ref.current.querySelector('[data-particle-upright]')?.setAttribute('transform', `rotate(${-angle})`);
              } else {
                ref.current.style.display = 'none';
              }
            }
            break;
          }
        }
      } catch {
        hideAllParticles();
      }
    };

    updateFrame(simulationClock.getTime());

    const unsubClock = simulationClock.subscribe(updateFrame);

    const unsubStore = useAppStore.subscribe((state, prevState) => {
      if (
        state.logicalData !== prevState.logicalData ||
        state.visualData !== prevState.visualData ||
        state.schedules !== prevState.schedules
      ) {
        updateFrame(simulationClock.getTime());
      }
    });

    return () => {
      unsubClock();
      unsubStore();
      hideAllParticles();
    };
  }, [seqsForEdge, pathRef, particleRefs, isAnimating]);

  return {
    isAnimating,
    isSelected,
    isAsync,
    seqsForEdge,
    activeStepNumber,
  };
};

