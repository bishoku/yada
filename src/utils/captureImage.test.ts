import {afterEach,expect,it,vi} from 'vitest';
import {loadCaptureImage} from './captureImage';
const images:any[]=[];
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();images.length=0;});
function setup(){vi.useFakeTimers();vi.stubGlobal('Image',class{src='';onload:any;onerror:any;constructor(){images.push(this);}});}
it('keeps successful images while clearing callbacks and timeout',async()=>{
 setup();const pending=loadCaptureImage('data:image/svg+xml,valid');images[0].onload();expect(await pending).toBe(images[0]);expect(images[0].src).toContain('valid');expect(images[0].onload).toBeNull();expect(vi.getTimerCount()).toBe(0);
});
it('releases a failed image and prevents a second callback',async()=>{
 setup();const pending=expect(loadCaptureImage('invalid')).rejects.toThrow('decoded');images[0].onerror();await pending;expect(images[0].src).toBe('');expect(images[0].onerror).toBeNull();expect(vi.getTimerCount()).toBe(0);
});
it('bounds an image that never dispatches a load or error event',async()=>{
 setup();const pending=expect(loadCaptureImage('stalled')).rejects.toThrow('decoded');await vi.advanceTimersByTimeAsync(10_000);await pending;expect(images[0].src).toBe('');expect(vi.getTimerCount()).toBe(0);
});
