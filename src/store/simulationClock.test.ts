import { describe, it, expect, beforeEach, vi } from 'vitest';
import { simulationClock } from './simulationClock';

describe('simulationClock', () => {
  beforeEach(() => {
    simulationClock.reset();
  });

  it('initializes with time 0 and not playing', () => {
    expect(simulationClock.getTime()).toBe(0);
    expect(simulationClock.getIsPlaying()).toBe(false);
  });

  it('updates time and notifies listeners', () => {
    const listener = vi.fn();
    const unsub = simulationClock.subscribe(listener);

    // Called on subscribe
    expect(listener).toHaveBeenCalledWith(0, false);

    simulationClock.setTime(250);
    expect(simulationClock.getTime()).toBe(250);
    expect(listener).toHaveBeenCalledWith(250, false);

    unsub();
    simulationClock.setTime(500);
    expect(listener).not.toHaveBeenCalledWith(500, false);
  });

  it('updates playing state and notifies listeners', () => {
    const listener = vi.fn();
    simulationClock.subscribe(listener);

    simulationClock.setIsPlaying(true);
    expect(simulationClock.getIsPlaying()).toBe(true);
    expect(listener).toHaveBeenCalledWith(0, true);
  });

  it('resets time and playing state', () => {
    simulationClock.setTime(1000);
    simulationClock.setIsPlaying(true);

    simulationClock.reset();
    expect(simulationClock.getTime()).toBe(0);
    expect(simulationClock.getIsPlaying()).toBe(false);
  });
});
