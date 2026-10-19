import {expect,it} from 'vitest';
import {withCaptureLock} from './captureLock';
it('serializes playback ownership and permits a later export after failure',async()=>{
 const events:string[]=[];let release!:()=>void;
 const first=withCaptureLock(async()=>{events.push('first');await new Promise<void>(resolve=>{release=resolve;});events.push('restored');throw Error('capture failed');});
 const second=withCaptureLock(async()=>{events.push('second');return 'ok';});
 await Promise.resolve();expect(events).toEqual(['first']);release();await expect(first).rejects.toThrow('capture failed');await expect(second).resolves.toBe('ok');expect(events).toEqual(['first','restored','second']);
});
