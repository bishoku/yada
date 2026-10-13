import { simulationClock } from '../../store/simulationClock';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseTiming, seekFromPosition, stepNavigationTarget, timelineScale, timingFromDrag } from './timingModel';
import { commitStepTiming } from './timingActions';
import { setDiagramDataInStore, useAppStore } from '../../store/useAppStore';
import { calculateSchedules } from '../../store/scheduler';
import { terminology, formatMilliseconds } from '../../i18n/terminology';
import { translations } from '../../i18n/translations';
import type { LogicalDiagram, VisualDiagram } from '../../types';

const logical: LogicalDiagram = { schemaVersion: 2, nodes: [{ id: 'a', name: 'A', type: 'client' }, { id: 'b', name: 'B', type: 'server' }], edges: [{ id: 'e', sourceId: 'a', targetId: 'b', isAsync: false }], sequences: [{ id: 's', edgeId: 'e', stepNumber: 1, isAsync: false, isRoundTrip: true }] };
const visual: VisualDiagram = { canvas: { zoom: 1, pan: { x: 0, y: 0 } }, layoutNodes: {}, layoutEdges: {}, timelines: { s: { sequenceId: 's', duration: 25.125, delay: 0.75, internalProcess: { text: 'Existing text', duration: 12.5 }, animationMode: 'repeat', repeatParticleCount: 7 } } };
const initial = useAppStore.getInitialState();
beforeEach(() => { useAppStore.setState(initial, true); setDiagramDataInStore(structuredClone(logical), structuredClone(visual)); });
afterEach(() => useAppStore.setState(initial, true));

describe('timeline interactions', () => {
  it('resumes at a paused or sought position while explicit start/stop retain reset behavior', () => {
    const state = useAppStore.getState();
    state.setCurrentTime(12.5);
    state.resumePlayback();
    expect(simulationClock.getTime()).toBe(12.5);
    expect(useAppStore.getState().isPlaying).toBe(true);
    state.pausePlayback();
    expect(simulationClock.getTime()).toBe(12.5);
    state.startPlayback();
    expect(simulationClock.getTime()).toBe(0);
    state.setCurrentTime(20);
    state.stopPlayback();
    expect(simulationClock.getTime()).toBe(0);
    expect(useAppStore.getState().visualData).toEqual(visual);
  });
  it('zooms independently of time and seeks correctly in horizontally scrolled content', () => {
    const fit = timelineScale(624, 6000, 1), zoom = timelineScale(624, 6000, 4);
    expect(fit.pxPerMs).toBe(0.1);
    expect(zoom.pxPerMs).toBe(0.4);
    expect(zoom.contentWidth).toBe(2424);
    expect(seekFromPosition(200, -200, zoom.pxPerMs, 6000)).toBe(1000);
    expect(seekFromPosition(-300, -200, zoom.pxPerMs, 6000)).toBe(0);
    expect(seekFromPosition(10000, -200, zoom.pxPerMs, 6000)).toBe(6000);
    expect(useAppStore.getState().visualData).toEqual(visual);
  });
  it('preserves sub-100ms legacy duration on a no-op gesture and snaps actual gestures to 50ms', () => {
    const timing = { duration: 25.125, delay: 0.75 };
    expect(timingFromDrag(timing, 0, 0.1, true)).toEqual(timing);
    expect(timingFromDrag(timing, 10, 0.1, false)).toEqual({ duration: 25.125, delay: 100.75 });
    expect(timingFromDrag(timing, -100, 0.1, false).delay).toBe(0);
  });
  it.each([['', '0'], ['-1', '0'], ['NaN', '10'], ['Infinity', '0'], ['1', '-2']])('rejects invalid timing %s / %s', (duration, delay) => {
    expect(parseTiming(duration, delay)).toBeNull();
  });
  it('retains exact decimal timing values and accepts zero without default substitution', () => {
    expect(parseTiming('25.125', '0.75')).toEqual({ duration: 25.125, delay: 0.75 });
    expect(parseTiming('0', '0')).toEqual({ duration: 0, delay: 0 });
  });
  it('navigates concurrent steps without skipping equal start times', () => {
    const steps = ['a', 'b', 'c'].map(id => ({ id, edgeId: 'e', stepNumber: 1, isAsync: false }));
    const schedules = { a: { start: 0, end: 100 }, b: { start: 0, end: 100 }, c: { start: 100, end: 200 } };
    expect(stepNavigationTarget(steps, schedules, null, 0, 1)?.id).toBe('a');
    expect(stepNavigationTarget(steps, schedules, 'a', 0, 1)?.id).toBe('b');
    expect(stepNavigationTarget(steps, schedules, 'b', 0, -1)?.id).toBe('a');
    expect(stepNavigationTarget(steps, schedules, 'c', 100, 1)).toBeUndefined();
    expect(stepNavigationTarget(steps, schedules, 'a', 0, -1)).toBeUndefined();
  });
});

describe('backward-compatible timing transactions', () => {
  it('does not dirty, normalize or create history for unchanged legacy timing', () => {
    const before = useAppStore.getState();
    expect(commitStepTiming('s', { duration: 25.125, delay: 0.75 })).toBe(false);
    expect(useAppStore.getState().visualData).toBe(before.visualData);
    expect(useAppStore.getState().pastStates).toHaveLength(0);
    expect(useAppStore.getState().isDirty).toBe(false);
  });
  it('commits timing and process together with one undo point, preserving metadata and IDs', () => {
    expect(commitStepTiming('s', { duration: 1500.25, delay: 12.5 }, { text: 'Edited work', duration: 200.5 })).toBe(true);
    let state = useAppStore.getState();
    expect(state.pastStates).toHaveLength(1);
    expect(state.logicalData).toEqual(logical);
    expect(state.visualData.timelines.s).toEqual({ ...visual.timelines.s, duration: 1500.25, delay: 12.5, internalProcess: { text: 'Edited work', duration: 200.5 } });
    expect(state.schedules).toEqual(calculateSchedules(logical.sequences, state.visualData.timelines, logical.edges, logical.nodes));
    state.undo(); state = useAppStore.getState();
    expect(state.visualData).toEqual(visual);
    expect(state.schedules).toEqual(calculateSchedules(logical.sequences, visual.timelines, logical.edges, logical.nodes));
    state.redo();
    expect(useAppStore.getState().visualData.timelines.s.duration).toBe(1500.25);
  });
  it.each([{ isReadOnly: true }, { isPlaying: true }])('blocks edits while restricted: %s', restriction => {
    const before = useAppStore.getState().visualData;
    useAppStore.setState(restriction);
    expect(commitStepTiming('s', { duration: 2000, delay: 0 })).toBe(false);
    expect(useAppStore.getState().visualData).toBe(before);
    expect(useAppStore.getState().pastStates).toHaveLength(0);
  });
  it('does not apply a stale gesture to a different document that reuses the same step ID', () => {
    const originalDocument = useAppStore.getState().logicalData;
    setDiagramDataInStore(structuredClone(logical), structuredClone(visual));
    expect(commitStepTiming('s', { duration: 2000, delay: 100 }, undefined, originalDocument)).toBe(false);
    expect(useAppStore.getState().visualData).toEqual(visual);
    expect(useAppStore.getState().pastStates).toHaveLength(0);
  });
  it('rejects missing steps and non-finite values without mutations', () => {
    expect(commitStepTiming('missing', { duration: 1000, delay: 0 })).toBe(false);
    expect(commitStepTiming('s', { duration: NaN, delay: 0 })).toBe(false);
    expect(useAppStore.getState().pastStates).toHaveLength(0);
  });
});

describe('UI terminology', () => {
  it('shares domain keys, timing concepts and translated controls across locales', () => {
    expect(Object.keys(terminology.en).sort()).toEqual(Object.keys(terminology.tr).sort());
    expect(Object.keys(translations.en.timelineUi).sort()).toEqual(Object.keys(translations.tr.timelineUi).sort());
    for (const locale of ['en', 'tr'] as const) {
      const t = translations[locale];
      expect(t.timelineTitle).toBe(t.terms.timeline);
      expect(t.step).toBe(t.terms.step);
      expect(t.roundTrip).toBe(t.terms.roundTrip);
      expect(t.timelineUi.duration).toBe(`${t.terms.duration} (ms)`);
      expect(t.timelineUi.delay).toBe(`${t.terms.delay} (ms)`);
    }
  });
  it('formats numbers by locale without changing stored numeric values', () => {
    expect(formatMilliseconds(1234.5, 'en')).toBe('1,234.5 ms');
    expect(formatMilliseconds(1234.5, 'tr')).toBe('1.234,5 ms');
    expect(useAppStore.getState().visualData).toEqual(visual);
  });
});
