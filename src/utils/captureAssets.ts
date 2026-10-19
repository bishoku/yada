import { waitForDocumentFonts } from '../styles/loadSketchFonts';
import { findDeviconItem, getDeviconComponent } from '../registry/DeviconRegistry';
import { preloadDevicon } from '../registry/lazyDevicon';
import { useAppStore } from '../store/useAppStore';
export async function prepareDocumentIcons() {
  await waitForDocumentFonts();
  const layouts = useAppStore.getState().visualData.layoutNodes;
  await Promise.all(Object.values(layouts).map(async layout => {
    const styles = layout.customStyles;
    if (!styles?.productIcon) return;
    const item = findDeviconItem(styles.productIcon);
    if (item) await preloadDevicon(getDeviconComponent(item, styles.productIconColored !== false, !!styles.productIconWordmark));
  }));
  if (typeof requestAnimationFrame === 'function') await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

