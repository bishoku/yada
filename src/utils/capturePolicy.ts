/** Editor chrome is omitted; diagram styling, shadows and active state are retained. */
export const CAPTURE_EXCLUDE = '.react-flow__controls, .react-flow__panel, .react-flow__minimap, .react-flow__attribution, .export-exclude, .react-flow__handle, .react-flow__resize-control, .react-flow__edgeupdater';
export function excludeCaptureElement(node: HTMLElement, particles = false) {
  return !!node?.matches?.(CAPTURE_EXCLUDE) || (particles && !!node?.hasAttribute?.('data-capture-particle'));
}
export function canvasBackground(node: HTMLElement, fallback = '#f8fafc') {
  if (typeof getComputedStyle !== 'function') return fallback;
  for (let element: HTMLElement | null = node; element; element = element.parentElement) {
    const color = getComputedStyle(element).backgroundColor;
    if (color && color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)') return color;
  }
  return fallback;
}

const hiddenDisplays = new WeakMap<Element,{value:string;priority:string;captures:number}>();
/** SVG subtrees are cloned wholesale by html-to-image, so its filter alone is insufficient. */
export function hideCaptureElements(root: ParentNode = document, particles = false) {
  const elements = root.querySelectorAll(`${CAPTURE_EXCLUDE}${particles?', [data-capture-particle]':''}`);
  elements.forEach(element=>{
    const style = (element as HTMLElement).style, existing = hiddenDisplays.get(element);
    if (existing) existing.captures++;
    else hiddenDisplays.set(element,{value:style.getPropertyValue('display'),priority:style.getPropertyPriority('display'),captures:1});
    style.setProperty('display','none','important');
  });
  return () => elements.forEach(element=>{
    const previous = hiddenDisplays.get(element);
    if (previous && --previous.captures > 0) return;
    const style = (element as HTMLElement).style;
    if (previous?.value) style.setProperty('display',previous.value,previous.priority);
    else style.removeProperty('display');
    hiddenDisplays.delete(element);
  });
}
