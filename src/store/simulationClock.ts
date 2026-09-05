/**
 * simulationClock.ts
 *
 * High-performance, lightweight pub-sub simulation clock.
 * Dispatches 60-120fps animation ticks directly to subscribing visual elements
 * (particles, playhead scrub line, header counter) without triggering full React
 * reconciliation cascades across the global Zustand store.
 */

type ClockListener = (time: number, isPlaying: boolean) => void;

class SimulationClock {
  private currentTime = 0;
  private isPlaying = false;
  private listeners: Set<ClockListener> = new Set();

  /**
   * Subscribe to high-frequency frame updates.
   * Returns an unsubscribe function.
   */
  subscribe(listener: ClockListener): () => void {
    this.listeners.add(listener);
    // Immediately emit current state to the new listener
    listener(this.currentTime, this.isPlaying);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get the current high-resolution playback time in milliseconds.
   */
  getTime(): number {
    return this.currentTime;
  }

  /**
   * Get whether simulation is currently playing.
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Set playback state.
   */
  setIsPlaying(playing: boolean, emit = true): void {
    if (this.isPlaying !== playing) {
      this.isPlaying = playing;
      if (emit) {
        this.emit();
      }
    }
  }

  /**
   * Update the simulation time and notify listeners.
   */
  setTime(time: number, emit = true): void {
    this.currentTime = Math.max(0, time);
    if (emit) {
      this.emit();
    }
  }

  /**
   * Reset time to 0.
   */
  reset(): void {
    this.currentTime = 0;
    this.isPlaying = false;
    this.emit();
  }

  /**
   * Notify all registered listeners with the current time and playing state.
   */
  private emit(): void {
    const time = this.currentTime;
    const playing = this.isPlaying;
    this.listeners.forEach((listener) => {
      try {
        listener(time, playing);
      } catch (err) {
        console.error('[SimulationClock] Listener error:', err);
      }
    });
  }
}

export const simulationClock = new SimulationClock();
