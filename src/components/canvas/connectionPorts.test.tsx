import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
const connection=vi.hoisted(()=>({inProgress:true,fromHandle:{type:'source' as 'source'|'target'}}));
vi.mock('@xyflow/react',async importOriginal=>({...await importOriginal<typeof import('@xyflow/react')>(),useConnection:()=>connection,Handle:({type,className,style}:any)=><div data-kind={type} className={className} style={style}/>}));
import {ReactFlowProvider} from '@xyflow/react';
import {BaseNode} from './BaseNode';
import {FreeFormNode} from './FreeFormNode';
import {useAppStore} from '../../store/useAppStore';
import {createStarterDiagram} from '../../features/onboarding/starterDiagram';
const initial=useAppStore.getInitialState(),original={...initial};
afterEach(()=>Object.assign(initial,original));
it.each([['component',BaseNode],['freeform',FreeFormNode]] as const)('exposes the correct drop layer for both ends of a %s',(_name,Component)=>{
 Object.assign(initial,createStarterDiagram('en'),{isPlaying:false,isReadOnly:false});
 for(const from of ['source','target'] as const){
  connection.fromHandle.type=from;
  const markup=renderToStaticMarkup(<ReactFlowProvider><Component id="starter-client" data={{name:'Client',type:'client'}} selected/></ReactFlowProvider>);
  const ports=markup.match(/<div data-kind="[^>]+>/g) ?? [];
  expect(ports).toHaveLength(8);
  const enabled=ports.filter(port=>port.includes('handle-drop-target'));
  expect(enabled).toHaveLength(4);expect(enabled.every(port=>port.includes(`data-kind="${from==='target'?'source':'target'}"`))).toBe(true);
  expect(ports.every(port=>!port.includes('margin-left')&&!port.includes('margin-top'))).toBe(true);
 }
});
