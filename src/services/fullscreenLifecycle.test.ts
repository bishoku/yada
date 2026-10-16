import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const native=vi.hoisted(()=>({isFullscreen:vi.fn(),onResized:vi.fn(),unlisten:vi.fn()}));
vi.mock('@tauri-apps/api/window',()=>({getCurrentWindow:()=>native}));
import { useAppStore } from '../store/useAppStore';
const initial=useAppStore.getState();
beforeEach(()=>{vi.clearAllMocks();native.isFullscreen.mockResolvedValue(false);native.onResized.mockResolvedValue(native.unlisten);});
afterEach(()=>{vi.unstubAllGlobals();useAppStore.setState(initial,true);});
it('removes browser listeners on each mount/dispose cycle',()=>{
  const handlers=new Set<EventListener>();
  vi.stubGlobal('document',{fullscreenElement:null,addEventListener:(_name:string,handler:EventListener)=>handlers.add(handler),removeEventListener:(_name:string,handler:EventListener)=>handlers.delete(handler)});
  const first=useAppStore.getState().initFullscreenListener(), second=useAppStore.getState().initFullscreenListener();
  expect(handlers.size).toBe(2);first();expect(handlers.size).toBe(1);second();expect(handlers.size).toBe(0);
});
it('unsubscribes native resize and cancels setup after early disposal',async()=>{
  vi.stubGlobal('window',{__TAURI_INTERNALS__:{}});
  const first=useAppStore.getState().initFullscreenListener();
  await vi.waitFor(()=>expect(native.onResized).toHaveBeenCalledOnce());first();expect(native.unlisten).toHaveBeenCalledOnce();
  vi.clearAllMocks();const second=useAppStore.getState().initFullscreenListener();second();
  await Promise.resolve();await Promise.resolve();expect(native.onResized).not.toHaveBeenCalled();
});
