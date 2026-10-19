import {afterEach,beforeEach,expect,it,vi} from 'vitest';
vi.mock('html-to-image',()=>({toSvg:vi.fn()}));
vi.mock('./captureFonts',()=>({captureFontCSS:vi.fn(async()=>'' )}));
import {toSvg} from 'html-to-image';
import {captureCanvasScene} from './captureScene';
import {createStarterDiagram} from '../features/onboarding/starterDiagram';
import {setDiagramDataInStore,useAppStore} from '../store/useAppStore';
import {simulationClock} from '../store/simulationClock';
import {isFullSequenceCapture} from '../services/sequenceCapture';
const initial=useAppStore.getInitialState();
let remove:ReturnType<typeof vi.fn>, restored:ReturnType<typeof vi.fn>, attributes:Map<string,string>;
beforeEach(()=>{
 useAppStore.setState(initial,true);const doc=createStarterDiagram('tr');setDiagramDataInStore(doc.logicalData,doc.visualData);useAppStore.getState().setCurrentTime(123);useAppStore.setState({isDirty:true,language:'tr'});
 attributes=new Map();remove=vi.fn();restored=vi.fn(async()=>{expect(isFullSequenceCapture()).toBe(true);});
 const node={clientWidth:800,clientHeight:600,getAttribute:(key:string)=>attributes.get(key)??null,setAttribute:(key:string,value:string)=>attributes.set(key,value),removeAttribute:(key:string)=>attributes.delete(key),getBoundingClientRect:()=>({left:0,top:0}),querySelectorAll:(selector:string)=>selector==='[data-capture-state]'?[{getAttribute:()=>simulationClock.getTime()<500?'active':'idle'}]:[]};
 vi.stubGlobal('document',{querySelector:()=>node,createElement:()=>({dataset:{},textContent:'',remove}),head:{appendChild:vi.fn()},documentElement:{classList:{contains:()=>false}},fonts:{ready:Promise.resolve()}});
 vi.stubGlobal('window',{dispatchEvent:(event:CustomEvent)=>{if(event.type==='export:rememberview')event.detail.push(restored);}});
 vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{callback(0);return 1;});
 vi.mocked(toSvg).mockResolvedValue('data:image/svg+xml,%3Csvg/%3E');
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();useAppStore.setState(initial,true);simulationClock.reset();});
it('captures each visual state once and restores playback, document, language and viewport scope',async()=>{
 const before=useAppStore.getState();before.resumePlayback();
 const scene=await captureCanvasScene('.react-flow',1000,10);
 expect(toSvg).toHaveBeenCalledTimes(2);expect(scene.frames).toHaveLength(11);expect(scene.backgrounds).toHaveLength(2);expect(scene.frames.at(-1)?.time).toBe(1000);expect(scene.frames[4].background).toBe(0);expect(scene.frames[5].background).toBe(1);
 expect(useAppStore.getState().logicalData).toBe(before.logicalData);expect(useAppStore.getState().visualData).toBe(before.visualData);expect(useAppStore.getState().isDirty).toBe(true);expect(useAppStore.getState().isPlaying).toBe(true);expect(simulationClock.getTime()).toBe(123);expect(isFullSequenceCapture()).toBe(false);expect(remove).toHaveBeenCalledOnce();expect(restored).toHaveBeenCalledOnce();expect(attributes.has('lang')).toBe(false);
});
it('rejects a changed document without restoring the previous document playback into the new one',async()=>{
 vi.mocked(toSvg).mockImplementationOnce(async()=>{const next=createStarterDiagram('en');setDiagramDataInStore(next.logicalData,next.visualData);useAppStore.getState().setCurrentTime(777);return 'data:image/svg+xml,%3Csvg/%3E';});
 await expect(captureCanvasScene('.react-flow',1000,10)).rejects.toThrow('diyagram değişti');
 expect(simulationClock.getTime()).toBe(777);expect(remove).toHaveBeenCalledOnce();expect(isFullSequenceCapture()).toBe(false);expect(attributes.has('lang')).toBe(false);
});
it('releases capture ownership on a failed image snapshot',async()=>{
 vi.mocked(toSvg).mockRejectedValueOnce(Error('decode failed'));
 await expect(captureCanvasScene('.react-flow',1000,10)).rejects.toThrow('decode failed');expect(simulationClock.getTime()).toBe(123);expect(remove).toHaveBeenCalledOnce();expect(isFullSequenceCapture()).toBe(false);
});
