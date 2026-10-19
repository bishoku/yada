import {afterEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({render:vi.fn(),dispose:vi.fn(),configure:vi.fn(),encoders:[] as any[],frames:[] as any[],canvas:{} as any}));
vi.mock('./captureScene',()=>({createSceneRenderer:async()=>({canvas:mocks.canvas,render:mocks.render,dispose:mocks.dispose})}));
vi.mock('mp4-muxer',()=>({ArrayBufferTarget:class{buffer=new ArrayBuffer(1)},Muxer:class{addVideoChunk(){}finalize(){}}}));
vi.mock('webm-muxer',()=>({ArrayBufferTarget:class{buffer=new ArrayBuffer(1)},Muxer:class{addVideoChunk(){}finalize(){}}}));
import {encodeSceneVideo} from './streamSceneVideo';
import type {CaptureScene} from './captureScene';
const scene:CaptureScene={width:101,height:51,dark:false,duration:1001,fps:30,color:'#fff',backgrounds:[],sprites:[],frames:Array.from({length:32},(_,i)=>({time:Math.min(i*1000/30,1001),background:0,particles:[]})),metrics:{captureMs:0,snapshots:0,frames:32,serializedBytes:0}};
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.clearAllMocks();mocks.encoders.length=0;mocks.frames.length=0;});
function setup(fail=false){
 const canvas={};mocks.render.mockResolvedValue(canvas);
 vi.stubGlobal('VideoFrame',class{source:any;options:any;close=vi.fn();constructor(source:any,options:any){this.source=source;this.options=options;mocks.frames.push(this);}});
 vi.stubGlobal('VideoEncoder',class extends EventTarget{static async isConfigSupported(){return{supported:true}}state='configured';encodeQueueSize=0;callback:any;close=vi.fn(()=>{this.state='closed'});constructor(callback:any){super();this.callback=callback;mocks.encoders.push(this);}configure(config:any){mocks.configure(config);if(fail)throw Error('codec failed');}encode(){this.encodeQueueSize++;this.callback.output({},{});if(this.encodeQueueSize>=4)setTimeout(()=>{this.encodeQueueSize=0;this.dispatchEvent(new Event('dequeue'));},0);}async flush(){this.encodeQueueSize=0;}});
 return canvas;
}
it('streams one reused canvas with a bounded queue and exact duration, closing every frame and encoder',async()=>{
 const canvas=setup();const result=await encodeSceneVideo(scene,'medium',1.5);
 expect(result.format).toBe('mp4');expect(result.metrics.maxQueue).toBeLessThanOrEqual(4);expect(mocks.render).toHaveBeenCalledTimes(31);expect(new Set(mocks.frames.map(f=>f.source))).toEqual(new Set([canvas]));expect(mocks.frames.every(f=>f.close.mock.calls.length===1)).toBe(true);expect(mocks.encoders[0].close).toHaveBeenCalledOnce();expect(mocks.dispose).toHaveBeenCalledOnce();expect(mocks.configure).toHaveBeenCalledWith(expect.objectContaining({width:152,height:78}));
 const final=mocks.frames.at(-1)!;expect(final.options.timestamp+final.options.duration).toBe(1001000);
});
it('closes failed codec attempts and releases the renderer when all codecs fail',async()=>{
 setup(true);vi.stubGlobal('MediaRecorder',undefined);
 await expect(encodeSceneVideo(scene,'low')).rejects.toThrow('No video encoder');
 expect(mocks.encoders).toHaveLength(5);expect(mocks.encoders.every(e=>e.close.mock.calls.length===1)).toBe(true);expect(mocks.dispose).toHaveBeenCalledOnce();
});
it('rejects a non-positive output scale before allocating frames',async()=>{
 await expect(encodeSceneVideo(scene,'medium',0)).rejects.toThrow('Invalid video scale');expect(mocks.render).not.toHaveBeenCalled();expect(mocks.dispose).not.toHaveBeenCalled();
});

it('stops media tracks and disposes the renderer if recorder creation fails',async()=>{
 vi.stubGlobal('VideoEncoder',undefined);
 const stop=vi.fn();const captureStream=vi.fn(()=>({getVideoTracks:()=>[{}],getTracks:()=>[{stop}]}));mocks.canvas.captureStream=captureStream;
 vi.stubGlobal('MediaRecorder',class{static isTypeSupported(){return true;}constructor(){throw Error('recorder unavailable');}});
 await expect(encodeSceneVideo(scene,'low')).rejects.toThrow('No recording format could be started');expect(captureStream).toHaveBeenCalledWith(scene.fps);expect(stop).toHaveBeenCalledOnce();expect(mocks.dispose).toHaveBeenCalledOnce();
});

it('tries the next supported recorder format when MP4 construction fails',async()=>{
 vi.useFakeTimers();vi.stubGlobal('VideoEncoder',undefined);
 const stop=vi.fn(),requestFrame=vi.fn(),attempts:string[]=[];
 mocks.canvas.captureStream=vi.fn(()=>({getVideoTracks:()=>[{requestFrame}],getTracks:()=>[{stop}]}));mocks.render.mockResolvedValue({});
 vi.stubGlobal('MediaRecorder',class{
  static isTypeSupported(){return true;}
  state='inactive';mimeType:string;onstart:any;onstop:any;onerror:any;ondataavailable:any;
  constructor(_stream:any,options:any){attempts.push(options.mimeType);this.mimeType=options.mimeType;if(this.mimeType==='video/mp4')throw Error('unavailable');}
  start(){this.state='recording';queueMicrotask(()=>this.onstart?.());}
  stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['video'])});this.onstop?.();}
 });
 const resultPromise=encodeSceneVideo(scene,'medium');await vi.runAllTimersAsync();const result=await resultPromise;
 expect(result.format).toBe('webm');expect(result.blob.size).toBeGreaterThan(0);expect(attempts).toEqual(['video/mp4','video/webm;codecs=vp9']);expect(requestFrame).toHaveBeenCalledTimes(31);expect(stop).toHaveBeenCalledOnce();expect(mocks.dispose).toHaveBeenCalledOnce();
});
it('does not retry a failed scene render for every codec',async()=>{
 setup();mocks.render.mockRejectedValueOnce(Error('SVG decode failed'));
 await expect(encodeSceneVideo(scene,'medium')).rejects.toThrow('SVG decode failed');expect(mocks.encoders).toHaveLength(1);expect(mocks.encoders[0].close).toHaveBeenCalledOnce();expect(mocks.dispose).toHaveBeenCalledOnce();
});

it('times out a recorder that never finishes and stops all stream tracks',async()=>{
 vi.useFakeTimers();vi.stubGlobal('VideoEncoder',undefined);const stop=vi.fn();mocks.render.mockResolvedValue({});
 mocks.canvas.captureStream=vi.fn(()=>({getVideoTracks:()=>[{}],getTracks:()=>[{stop}]}));
 vi.stubGlobal('MediaRecorder',class{
  static isTypeSupported(type:string){return type==='video/mp4';}state='inactive';mimeType='video/mp4';onstart:any;onstop:any;onerror:any;ondataavailable:any;
  start(){this.state='recording';queueMicrotask(()=>this.onstart?.());}stop(){this.state='inactive';}
 });
 const pending=expect(encodeSceneVideo(scene,'medium')).rejects.toThrow('No recording format could be started');await vi.runAllTimersAsync();await pending;expect(stop).toHaveBeenCalledOnce();expect(mocks.dispose).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
});
