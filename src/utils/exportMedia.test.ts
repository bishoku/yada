import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('html-to-image', () => ({toSvg:vi.fn(),toPng:vi.fn(),getFontEmbedCSS:vi.fn(async()=>''),}));
vi.mock('./captureFonts',()=>({captureFontCSS:vi.fn(async()=>'' )}));
import {toSvg} from 'html-to-image';
import { exportToSvg, generateSvgDataUrl } from './exportMedia';
import { useAppStore } from '../store/useAppStore';
import { isFullSequenceCapture } from '../services/sequenceCapture';

const initial=useAppStore.getState();
afterEach(() => { vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();useAppStore.setState(initial,true); });
describe('image export failure recovery', () => {
  it('reports a failed SVG capture and restores UI, viewport scope and document state', async () => {
    vi.useFakeTimers({shouldAdvanceTime:true});
    const display={value:'inline-flex',priority:'important'};
    const style={getPropertyValue:()=>display.value,getPropertyPriority:()=>display.priority,setProperty:(_name:string,value:string,priority:string)=>{display.value=value;display.priority=priority;},removeProperty:()=>{display.value='';}};
    const shadow={dataset:{},textContent:'',remove:vi.fn()};
    const restored=vi.fn(async()=>{expect(isFullSequenceCapture()).toBe(true);});
    vi.stubGlobal('window',{dispatchEvent:(event:CustomEvent)=>{if(event.type==='export:rememberview')event.detail.push(restored);}});
    vi.stubGlobal('document',{querySelector:()=>({clientWidth:800,clientHeight:600}),querySelectorAll:()=>[{style}],createElement:()=>shadow,head:{appendChild:vi.fn()},documentElement:{classList:{contains:()=>true}},fonts:{ready:Promise.resolve()}});
    vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{callback(0);return 1;});
    useAppStore.setState({isPlaying:false,isDirty:true});
    const logical=useAppStore.getState().logicalData, visual=useAppStore.getState().visualData;
    vi.mocked(toSvg).mockRejectedValueOnce(Error('SVG clone failed'));
    await expect(exportToSvg('.react-flow','diagram.svg','tr')).rejects.toThrow('SVG clone failed');
    expect(display).toEqual({value:'inline-flex',priority:'important'});
    expect(restored).toHaveBeenCalledOnce();expect(shadow.remove).not.toHaveBeenCalled();
    expect(document.head.appendChild).not.toHaveBeenCalled();
    expect(vi.mocked(toSvg).mock.calls[0][1]).not.toHaveProperty('style.filter');expect(isFullSequenceCapture()).toBe(false);
    expect(useAppStore.getState().logicalData).toBe(logical);expect(useAppStore.getState().visualData).toBe(visual);expect(useAppStore.getState().isDirty).toBe(true);
  });
  it('rejects a missing canvas rather than acknowledging an export', async () => {
    vi.stubGlobal('document',{querySelector:()=>null});
    await expect(generateSvgDataUrl('.missing',false)).rejects.toThrow('Diagram container not found');
    expect(isFullSequenceCapture()).toBe(false);
  });
});
