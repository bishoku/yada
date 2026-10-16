import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startSimulationLoop } from './playbackLoop';
import { playbackEnd } from './playbackModel';
import { useAppStore } from './useAppStore';
import { simulationClock } from './simulationClock';
const original = useAppStore.getState();
let queue: Map<number, FrameRequestCallback>, nextId: number;
const driver = { request(callback: FrameRequestCallback) { const id = ++nextId; queue.set(id, callback); return id; }, cancel(id: number) { queue.delete(id); } };
function frame(time: number) { const callbacks = [...queue.values()]; queue.clear(); callbacks.forEach(callback => callback(time)); }
beforeEach(() => { queue = new Map(); nextId = 0; simulationClock.reset(); useAppStore.setState({ ...original, isPlaying: false, currentTime: 0, playbackRate: 1, loopPlayback: true, schedules: { early: { start: 0, end: 100 }, late: { start: 100, end: 400 } } }, true); });
afterEach(() => { simulationClock.reset(); useAppStore.setState(original, true); });
describe('shared simulation loop', () => {
  it('advances the clock each frame but throttles store writes and honors live rate changes', () => {
    useAppStore.getState().startPlayback();
    const dispose = startSimulationLoop(1000, driver);
    frame(0); frame(16); frame(32);
    expect(simulationClock.getTime()).toBe(32);
    expect(useAppStore.getState().currentTime).toBe(0);
    useAppStore.getState().setPlaybackRate(2); frame(160);
    expect(simulationClock.getTime()).toBe(288);
    expect(useAppStore.getState().currentTime).toBe(288);
    expect(useAppStore.getState().activeSequenceIds).toEqual(['late']);
    dispose(); expect(queue.size).toBe(0);
  });
  it('syncs paused time and active IDs exactly, and resumes from a paused seek', () => {
    useAppStore.getState().startPlayback(); const dispose = startSimulationLoop(1000, driver);
    frame(0); frame(120); useAppStore.getState().pausePlayback();
    expect(useAppStore.getState().currentTime).toBe(120);
    expect(useAppStore.getState().activeSequenceIds).toEqual(['late']);
    frame(140); expect(queue.size).toBe(0); dispose();
    useAppStore.getState().setCurrentTime(50); useAppStore.getState().resumePlayback();
    const next = startSimulationLoop(1000, driver); frame(500); frame(520);
    expect(simulationClock.getTime()).toBe(70); next();
  });
  it('resets both playhead and active steps at loop boundaries without retiming the document', () => {
    const { logicalData, visualData } = useAppStore.getState();
    useAppStore.getState().startPlayback(); const dispose = startSimulationLoop(200, driver);
    frame(0); frame(160); expect(useAppStore.getState().activeSequenceIds).toEqual(['late']);
    frame(220);
    expect(simulationClock.getTime()).toBe(0);
    expect(useAppStore.getState().activeSequenceIds).toEqual(['early']);
    expect(useAppStore.getState().logicalData).toBe(logicalData);
    expect(useAppStore.getState().visualData).toBe(visualData); dispose();
  });
  it('lets the host viewer loop without changing the editor loop preference', () => {
    useAppStore.setState({ loopPlayback: false });
    useAppStore.getState().startPlayback();
    const dispose = startSimulationLoop(200, driver, { loop: true });
    frame(0); frame(210);
    expect(simulationClock.getTime()).toBe(0);
    expect(useAppStore.getState().isPlaying).toBe(true);
    expect(useAppStore.getState().loopPlayback).toBe(false);
    dispose(); expect(queue.size).toBe(0);
  });
  it('stops at the end with no extra frame and ignores disposed callbacks', () => {
    useAppStore.setState({ loopPlayback: false }); useAppStore.getState().startPlayback();
    const dispose = startSimulationLoop(200, driver); frame(0); frame(210);
    expect(useAppStore.getState().isPlaying).toBe(false);
    expect(useAppStore.getState().activeSequenceIds).toEqual([]);
    expect(queue.size).toBe(0); dispose();
    useAppStore.getState().startPlayback(); const stop = startSimulationLoop(200, driver);
    const stale = [...queue.values()][0]; stop(); stale(1000);
    expect(queue.size).toBe(0); expect(simulationClock.getTime()).toBe(0);
  });
  it('uses the same legacy process tail and minimum duration for editor/embed', () => {
    const steps = [{ id: 'one', edgeId: 'e', stepNumber: 1, isAsync: false }, { id: 'round', edgeId: 'e', stepNumber: 2, isAsync: false, isRoundTrip: true }];
    const timings = { one: { sequenceId: 'one', duration: 200, delay: 0, internalProcess: { text: 'work', duration: 700 } }, round: { sequenceId: 'round', duration: 200, delay: 0, internalProcess: { text: 'work', duration: 1000 } } };
    expect(playbackEnd(steps, timings, { one: { start: 0, end: 1800 }, round: { start: 0, end: 2100 } })).toBe(2500);
    expect(playbackEnd([], {}, {})).toBe(2000);
  });
});
