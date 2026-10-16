import archivedProject from './fixtures/request-flow.dproj.base64?raw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import { importWorkspace } from './workspaceZip';
import { StorageService } from '../services/storage';
import { createStarterDiagram } from '../features/onboarding/starterDiagram';

afterEach(() => vi.restoreAllMocks());
describe('project archive compatibility', () => {
  it.each(['logicalData', 'logical'])('opens %s envelope without changing content or round trips', async key => {
    vi.spyOn(StorageService,'get_global_components_dir').mockResolvedValue('virtual://components');
    const sample = createStarterDiagram('tr');
    const document = {[key]:sample.logicalData,[key==='logical'?'visual':'visualData']:sample.visualData};
    const zip = new JSZip().file('workspace.json',JSON.stringify({name:'İstek',description:'Eski proje'})).file('diagram.json',JSON.stringify(document));
    const save = vi.fn(async (_path: string, _id: string, _logical: string, _visual: string) => {});
    const workspace={id:'import',path:'virtual://import',name:'İstek',description:'',createdAt:'',lastAccessed:''};
    await importWorkspace(await zip.generateAsync({type:'uint8array'}),async () => workspace,save,async () => ({}),'en');
    expect(JSON.parse(save.mock.calls[0][2])).toEqual(sample.logicalData);
    expect(JSON.parse(save.mock.calls[0][3])).toEqual(sample.visualData);
  });
  it('rejects a broken archive before any workspace or component write', async () => {
    const zip=new JSZip().file('workspace.json','{"name":"broken"}').file('diagram.json','{');
    const create=vi.fn(), save=vi.fn(), components=vi.spyOn(StorageService,'save_text_file');
    await expect(importWorkspace(await zip.generateAsync({type:'uint8array'}),create,save,async()=>({}),'tr')).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();expect(save).not.toHaveBeenCalled();expect(components).not.toHaveBeenCalled();
  });
  it('reimports the archive downloaded from the production UI', async () => {
    vi.spyOn(StorageService,'get_global_components_dir').mockResolvedValue('virtual://components');
    const save=vi.fn(async (_path:string,_id:string,_logical:string,_visual:string)=>{});
    const workspace={id:'roundtrip',path:'virtual://roundtrip',name:'İstek',description:'',createdAt:'',lastAccessed:''};
    await importWorkspace(Uint8Array.from(atob(archivedProject.trim()),char=>char.charCodeAt(0)),async()=>workspace,save,async()=>({}),'tr');
    const logical=JSON.parse(save.mock.calls[0][2]);
    expect(logical.nodes.map((node:{name:string})=>node.name)).toEqual(['İstemci','API servisi','Veritabanı']);
    expect(logical.edges).toHaveLength(2);expect(logical.sequences).toHaveLength(2);
    expect(logical.sequences.every((step:{isRoundTrip:boolean})=>step.isRoundTrip)).toBe(true);
    expect(JSON.parse(save.mock.calls[0][3]).timelines['starter-step-1'].duration).toBe(1200);
  });

});
