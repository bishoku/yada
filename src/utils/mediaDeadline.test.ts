import {afterEach,expect,it,vi} from 'vitest';
import {mediaDeadline,waitForEncoderCapacity} from './mediaDeadline';
afterEach(()=>vi.useRealTimers());
it('clears deadline timers on completion and failure',async()=>{
 vi.useFakeTimers();await expect(mediaDeadline(Promise.resolve('done'),100)).resolves.toBe('done');await expect(mediaDeadline(Promise.reject(Error('failed')),100)).rejects.toThrow('failed');expect(vi.getTimerCount()).toBe(0);
});
it('bounds stalled encoder capacity waits and removes dequeue listeners',async()=>{
 vi.useFakeTimers();const encoder=Object.assign(new EventTarget(),{encodeQueueSize:4,state:'configured'});const remove=vi.spyOn(encoder,'removeEventListener');
 const pending=expect(waitForEncoderCapacity(encoder as unknown as VideoEncoder)).rejects.toThrow('timed out');await vi.advanceTimersByTimeAsync(10_000);await pending;expect(remove).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
});
it('waits for dequeue without flushing the encoder between batches',async()=>{
 const encoder=Object.assign(new EventTarget(),{encodeQueueSize:4,state:'configured'});const pending=waitForEncoderCapacity(encoder as unknown as VideoEncoder);encoder.encodeQueueSize=3;encoder.dispatchEvent(new Event('dequeue'));await pending;
});
