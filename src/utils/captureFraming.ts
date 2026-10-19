export type CaptureFraming = 'viewport' | 'diagram';
/** Must run inside the capture scope, which restores the viewport and suppresses persistence. */
export async function applyCaptureFraming(framing: CaptureFraming) {
  if (framing !== 'diagram') return;
  window.dispatchEvent(new CustomEvent('export:fitview'));
  await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
}
