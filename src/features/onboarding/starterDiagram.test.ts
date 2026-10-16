import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createStarterDiagram, isDiagramEmpty } from './starterDiagram';
import { insertStarterDiagram } from './insertStarterDiagram';
import { useAppStore } from '../../store/useAppStore';
import { simulationClock } from '../../store/simulationClock';
import { calculateSchedules } from '../../store/scheduler';

const original=useAppStore.getState();
const empty=() => ({logicalData:{schemaVersion:2,nodes:[],edges:[],sequences:[]},visualData:{canvas:{zoom:1,pan:{x:0,y:0}},layoutNodes:{},layoutEdges:{},timelines:{}}});
beforeEach(() => {
  useAppStore.setState({...original,...empty(),currentWorkspace:{id:'test',name:'Authored workspace',path:'virtual://test',description:'',createdAt:'',lastAccessed:''},activeDiagramId:'default',isPlaying:false,isReadOnly:false,isCollabActive:false,language:'tr',pastStates:[],futureStates:[]},true);
});
afterEach(() => { simulationClock.reset(); useAppStore.setState(original,true); });
describe('editable starter flow', () => {
  it('uses valid references and playable timing in both languages', () => {
    for(const language of ['tr','en'] as const) {
      const {logicalData:logical,visualData:visual}=createStarterDiagram(language);
      expect(logical.nodes).toHaveLength(3); expect(logical.sequences).toHaveLength(2);
      for(const edge of logical.edges) {
        expect(logical.nodes.some(node=>node.id===edge.sourceId)).toBe(true);
        expect(logical.nodes.some(node=>node.id===edge.targetId)).toBe(true);
      }
      const schedules=calculateSchedules(logical.sequences,visual.timelines,logical.edges,logical.nodes);
      expect(Object.values(schedules).every(schedule=>schedule.end>schedule.start)).toBe(true);
      expect(logical.edges.map(edge=>edge.protocol)).toEqual(['HTTP','SQL']);
      expect(logical.nodes[0].name).toBe(language==='tr'?'İstemci':'Client');
    }
  });
  it('inserts as one undoable edit, derives playback and preserves canvas preferences', () => {
    const state=useAppStore.getState();
    useAppStore.setState({visualData:{...state.visualData,canvas:{...state.visualData.canvas,bgColor:'#123456'}}});
    expect(insertStarterDiagram()).toBe(true);
    let current=useAppStore.getState();
    expect(current.isDirty).toBe(true); expect(current.isPlaying).toBe(false);
    expect(current.pastStates).toHaveLength(1);
    expect(Object.keys(current.schedules)).toHaveLength(2);
    expect(current.visualData.canvas.bgColor).toBe('#123456');
    const logical=current.logicalData;
    useAppStore.setState({language:'en'});
    expect(useAppStore.getState().logicalData).toBe(logical);
    current.undo(); expect(isDiagramEmpty(useAppStore.getState().logicalData,useAppStore.getState().visualData)).toBe(true);
    current.redo(); expect(useAppStore.getState().logicalData.nodes).toHaveLength(3);
    expect(insertStarterDiagram()).toBe(false);
  });
  it('never overwrites annotations, drawings, existing nodes or sequence metadata', () => {
    const starter=createStarterDiagram('en');
    expect(isDiagramEmpty(starter.logicalData,starter.visualData)).toBe(false);
    for(const property of ['annotations','freehandStrokes','layoutNodes'] as const) {
      const doc=empty(); const visual={...doc.visualData,[property]:{authored:{}}};
      expect(isDiagramEmpty(doc.logicalData,visual as typeof starter.visualData)).toBe(false);
    }
    const doc=empty();
    useAppStore.setState({logicalData:{...doc.logicalData,nodes:[{id:'authored',name:'İstek $&',type:'server'}]}});
    const before=useAppStore.getState().logicalData;
    expect(insertStarterDiagram()).toBe(false);
    expect(useAppStore.getState().logicalData).toBe(before);
  });
  it('respects read-only, active playback, live collaboration and preview boundaries', () => {
    for(const blocked of [{isReadOnly:true},{isPlaying:true},{isCollabActive:true},{activeDiagramId:null},{currentWorkspace:{...original.currentWorkspace!,path:'memory://preview'}}]) {
      const initial=useAppStore.getState(); useAppStore.setState(blocked);
      expect(insertStarterDiagram()).toBe(false);
      expect(useAppStore.getState().pastStates).toHaveLength(0);
      useAppStore.setState(initial,true);
    }
  });
});
