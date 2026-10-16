import { describe, expect, it, vi } from 'vitest';
import { deferredDriver } from './deferredDriver';
import type { IStorageDriver } from './types';
describe('deferred platform storage',()=>{
  it('keeps mode synchronous and coalesces platform imports, preserving method binding',async()=>{
    let release!: (driver:IStorageDriver)=>void;
    const factory=vi.fn(()=>new Promise<IStorageDriver>(resolve=>{release=resolve;}));
    const driver=deferredDriver('forge',factory);
    expect(driver.getMode()).toBe('forge');expect(factory).not.toHaveBeenCalled();
    const implementation={marker:'bound',load_preferences(){return Promise.resolve(this.marker);},load_diagram(path:string,id?:string){return Promise.resolve(`${this.marker}:${path}:${id}`);}};
    const a=driver.load_preferences(), b=driver.load_diagram('workspace','diagram');
    expect(factory).toHaveBeenCalledOnce();release(implementation as unknown as IStorageDriver);
    expect(await a).toBe('bound');expect(await b).toBe('bound:workspace:diagram');
    expect(await driver.load_preferences()).toBe('bound');expect(factory).toHaveBeenCalledOnce();
  });
  it('propagates import failures and retries on the next operation',async()=>{
    const factory=vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue({load_preferences:async()=>'{"language":"tr"}'});
    const driver=deferredDriver('tauri',factory);
    await expect(driver.load_preferences()).rejects.toThrow('offline');
    expect(await driver.load_preferences()).toContain('tr');expect(factory).toHaveBeenCalledTimes(2);
  });
});
