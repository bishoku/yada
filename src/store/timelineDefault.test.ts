import { afterEach, expect, it, vi } from 'vitest';
import { useAppStore } from './useAppStore';
import { StorageService } from '../services/storage';
import { createStarterDiagram } from '../features/onboarding/starterDiagram';
import type { WorkspaceMeta } from '../types';

const initial = useAppStore.getState();
const workspace: WorkspaceMeta = {id:'timing-audit',name:'Timing audit',description:'',createdAt:'2026-10-17',lastAccessed:'2026-10-17',path:'virtual://timing-audit'};
afterEach(() => {vi.restoreAllMocks();useAppStore.setState(initial,true);});
it('starts with advanced timing closed, retaining an explicit toolbar toggle',()=>{
  expect(useAppStore.getInitialState().timelineOpen).toBe(false);
  useAppStore.getState().toggleTimeline();expect(useAppStore.getState().timelineOpen).toBe(true);
  useAppStore.getState().toggleTimeline();expect(useAppStore.getState().timelineOpen).toBe(false);
});
it('closes advanced timing for a newly created document',async()=>{
  useAppStore.setState({timelineOpen:true,isDirty:false});
  vi.spyOn(StorageService,'create_workspace').mockResolvedValue(JSON.stringify(workspace));
  vi.spyOn(StorageService,'save_diagram').mockResolvedValue(undefined);
  vi.spyOn(StorageService,'save_text_file').mockResolvedValue(undefined);
  vi.spyOn(useAppStore.getState(),'fetchRecentWorkspaces').mockResolvedValue(undefined);
  vi.spyOn(useAppStore.getState(),'loadLibrary').mockResolvedValue(undefined);
  await useAppStore.getState().createWorkspace('Timing audit','');
  expect(useAppStore.getState().timelineOpen).toBe(false);
});
it('does not reopen advanced timing when switching documents',async()=>{
  const doc=createStarterDiagram('en');
  useAppStore.setState({currentWorkspace:workspace,activeDiagramId:'first',openDiagramIds:['first'],timelineOpen:true,isDirty:false,isCollabActive:false});
  vi.spyOn(StorageService,'load_diagram').mockResolvedValue(JSON.stringify(doc));
  await useAppStore.getState().switchDiagram('second');
  expect(useAppStore.getState().activeDiagramId).toBe('second');
  expect(useAppStore.getState().timelineOpen).toBe(false);
});
