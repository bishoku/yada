let tail: Promise<unknown> = Promise.resolve();
/** DOM capture owns the playback clock and viewport until its finally block completes. */
export function withCaptureLock<T>(capture: () => Promise<T>): Promise<T> {
  const result = tail.then(capture, capture);
  tail = result.then(() => undefined, () => undefined);
  return result;
}
