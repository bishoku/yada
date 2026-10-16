import type { IStorageDriver, StorageMode } from './types';
/** Resolve a platform driver only on its first operation; failed imports can retry. */
export function deferredDriver(mode: StorageMode, factory: () => Promise<IStorageDriver>): IStorageDriver {
  let pending: Promise<IStorageDriver> | undefined;
  const load=()=>pending ??= factory().catch(error=>{pending=undefined;throw error;});
  function call<K extends Exclude<keyof IStorageDriver,'getMode'>>(key: K, ...args: Parameters<IStorageDriver[K]>): ReturnType<IStorageDriver[K]> {
    return load().then(driver=>(driver[key] as (...values: Parameters<IStorageDriver[K]>)=>unknown).apply(driver,args)) as ReturnType<IStorageDriver[K]>;
  }
  return {
    getMode:()=>mode,
    create_workspace:(...args)=>call('create_workspace',...args),load_workspace:(...args)=>call('load_workspace',...args),save_workspace:(...args)=>call('save_workspace',...args),get_recent_workspaces:()=>call('get_recent_workspaces'),delete_workspace:(...args)=>call('delete_workspace',...args),
    save_diagram:(...args)=>call('save_diagram',...args),load_diagram:(...args)=>call('load_diagram',...args),save_preferences:(...args)=>call('save_preferences',...args),load_preferences:()=>call('load_preferences'),
    get_global_components_dir:()=>call('get_global_components_dir'),save_text_file:(...args)=>call('save_text_file',...args),read_text_file:(...args)=>call('read_text_file',...args),list_json_files_in_dir:(...args)=>call('list_json_files_in_dir',...args),delete_file:(...args)=>call('delete_file',...args),
  };
}
