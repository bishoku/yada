let pending: Promise<void> | undefined;

/** Optional local drawing fonts, relative to each deployment's configured base URL. */
export function loadSketchFonts(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (pending) return pending;
  pending = new Promise<void>((resolve,reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${import.meta.env.BASE_URL}fonts/sketch.css`;
    link.dataset.yadaSketchFonts = '';
    link.onload = () => resolve();
    link.onerror = () => { link.remove(); pending = undefined; reject(new Error('Drawing font stylesheet failed to load')); };
    document.head.appendChild(link);
  });
  return pending;
}

export async function waitForDocumentFonts() {
  if (pending) await pending;
  if (typeof document !== 'undefined' && document.fonts) await document.fonts.ready;
}
