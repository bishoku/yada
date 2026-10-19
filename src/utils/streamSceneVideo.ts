import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4Target } from 'mp4-muxer';
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmTarget } from 'webm-muxer';
import { createSceneRenderer, type CaptureScene } from './captureScene';
import { mediaDeadline, waitForEncoderCapacity } from './mediaDeadline';

export interface SceneVideoResult { blob: Blob; format: 'mp4' | 'webm'; metrics: { encodeMs: number; frames: number; maxQueue: number; pixelBuffers: number } }
class SceneRenderError extends Error {}
const bitrates = { low: 1_000_000, medium: 3_000_000, high: 8_000_000 };

/** Stream a reusable canvas through a bounded encoder queue. Never collect frame canvases. */
export async function encodeSceneVideo(scene: CaptureScene, quality: keyof typeof bitrates, scale = 1, progress: (value: number) => void = () => {}, encoderPreference: 'auto' | 'recorder' = 'auto'): Promise<SceneVideoResult> {
  if (!Number.isFinite(scale) || scale <= 0) throw new Error('Invalid video scale');
  const width = Math.max(2, Math.ceil(scene.width * scale / 2) * 2), height = Math.max(2, Math.ceil(scene.height * scale / 2) * 2);
  const renderer = await createSceneRenderer(scene, width, height);
  const frameCount = Math.max(1, scene.frames.length - 1), started = performance.now();
  let maxQueue = 0;
  const render = async (index: number) => {
    try { return await renderer.render(index); }
    catch (error) { throw new SceneRenderError(error instanceof Error ? error.message : String(error)); }
  };
  try {
    if (encoderPreference === 'auto' && typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined') {
      const candidates = [ { codec:'avc1.42001f', format:'mp4' }, { codec:'avc1.4d0028', format:'mp4' }, { codec:'avc1.640033', format:'mp4' }, { codec:'vp09.00.41.08', format:'webm' }, { codec:'vp8', format:'webm' } ] as const;
      for (const candidate of candidates) {
        const config: VideoEncoderConfig = { codec: candidate.codec, width, height, bitrate: Math.round(bitrates[quality] * Math.max(1,scale)), framerate: scene.fps, hardwareAcceleration: 'no-preference', latencyMode: 'realtime' };
        let encoder: VideoEncoder | undefined;
        try {
          if (!(await mediaDeadline(VideoEncoder.isConfigSupported(config),2_000)).supported) continue;
          let failure: Error | undefined;
          const target = candidate.format === 'mp4' ? new Mp4Target() : new WebmTarget();
          const muxer = candidate.format === 'mp4'
            ? new Mp4Muxer({ target: target as Mp4Target, video:{codec:'avc',width,height},fastStart:'in-memory',firstTimestampBehavior:'strict' })
            : new WebmMuxer({ target: target as WebmTarget, video:{codec:candidate.codec==='vp8'?'V_VP8':'V_VP9',width,height,frameRate:scene.fps},firstTimestampBehavior:'strict' });
          encoder = new VideoEncoder({ output(chunk, metadata) { try { muxer.addVideoChunk(chunk, metadata); } catch (error) { failure = error as Error; } }, error(error) { failure = error; } });
          encoder.configure(config);
          for (let index = 0; index < frameCount; index++) {
            if (failure) throw failure;
            const canvas = await render(index);
            const time = scene.frames[index].time, next = scene.frames[index+1]?.time ?? time + 1000 / scene.fps;
            const frame = new VideoFrame(canvas, { timestamp: Math.round(time * 1000), duration: Math.max(1,Math.round((next-time)*1000)) });
            try { encoder.encode(frame, {keyFrame:index % Math.max(1,Math.round(scene.fps*2)) === 0}); }
            finally { frame.close(); }
            maxQueue = Math.max(maxQueue, encoder.encodeQueueSize);
            await waitForEncoderCapacity(encoder);
            progress(Math.round((index+1)/frameCount*100));
            if (index % 8 === 0) await new Promise<void>(resolve => setTimeout(resolve,0));
          }
          await mediaDeadline(encoder.flush(),10_000);
          if (failure) throw failure;
          muxer.finalize();
          return { blob:new Blob([target.buffer],{type:`video/${candidate.format}`}),format:candidate.format,
            metrics:{encodeMs:performance.now()-started,frames:frameCount,maxQueue,pixelBuffers:3} };
        } catch (error) { if (error instanceof SceneRenderError || (error instanceof Error && error.name === 'SecurityError')) throw error; console.warn('[Video capture] Codec unavailable:',candidate.codec,error); }
        finally { if (encoder && encoder.state !== 'closed') encoder.close(); }
      }
    }
    if (typeof MediaRecorder === 'undefined') throw new Error('No video encoder available');
    const mimes = ['video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].filter(type=>MediaRecorder.isTypeSupported(type));
    if (!mimes.length) throw new Error('No recording format available');
    await render(0);
    const stream = renderer.canvas.captureStream(scene.fps);
    try {
      const track = stream.getVideoTracks()[0] as MediaStreamTrack & {requestFrame?:()=>void};
      if (!track) throw new Error('No video capture track available');
      for (const mime of mimes) {
        let recorder: MediaRecorder | undefined;
        try {
          recorder = new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:Math.round(bitrates[quality]*Math.max(1,scale))});
          const chunks: Blob[] = [];
          let failure: Error | undefined, stopped = false;
          const completed = new Promise<Blob>((resolve,reject)=>{
            recorder!.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
            recorder!.onstop=()=>{stopped=true;const blob=new Blob(chunks,{type:recorder!.mimeType || mime});if(blob.size)resolve(blob);else reject(new Error('Video recording is empty'));};
            recorder!.onerror=()=>{failure=new Error('Video recording failed');reject(failure);};
          });
          void completed.catch(()=>{});
          const ready = new Promise<void>(resolve=>{recorder!.onstart=()=>resolve();});
          recorder.start(1000);
          await mediaDeadline(ready,5_000);
          const start = performance.now();
          for (let index=0;index<frameCount;index++) {
            if (failure) throw failure;
            if (stopped) throw new Error('Video recording stopped early');
            await render(index); track.requestFrame?.();
            const next = scene.frames[index+1]?.time ?? 1000/scene.fps;
            await new Promise(resolve=>setTimeout(resolve,Math.max(0,next-(performance.now()-start))));
            progress(Math.round((index+1)/frameCount*100));
          }
          if (failure) throw failure;
          if (recorder.state !== 'inactive') recorder.stop();
          const blob = await mediaDeadline(completed,5_000);
          return {blob,format:blob.type.includes('mp4')?'mp4':'webm',metrics:{encodeMs:performance.now()-started,frames:frameCount,maxQueue:0,pixelBuffers:3}};
        } catch (error) {
          if (error instanceof SceneRenderError || (error instanceof Error && error.name==='SecurityError')) throw error;
          console.warn('[Video capture] Recorder format unavailable:',mime,error);
        } finally {
          if (recorder) {
            recorder.ondataavailable=recorder.onstop=recorder.onerror=recorder.onstart=null;
            if(recorder.state!=='inactive')recorder.stop();
          }
        }
      }
      throw new Error('No recording format could be started');
    } finally { stream.getTracks().forEach(track=>track.stop()); }

  } finally { renderer.dispose(); }
}
