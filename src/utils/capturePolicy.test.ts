import {afterEach,expect,it,vi} from 'vitest';
import {hideCaptureElements} from './capturePolicy';
afterEach(()=>vi.unstubAllGlobals());
it('hides nested SVG particles and preserves exact display/priority through overlapping captures',()=>{
 const display={value:'block',priority:''};
 const style={getPropertyValue:()=>display.value,getPropertyPriority:()=>display.priority,setProperty:(_key:string,value:string,priority:string)=>{display.value=value;display.priority=priority;},removeProperty:()=>{display.value='';display.priority='';}};
 const root={querySelectorAll:vi.fn(()=>[{style}])} as unknown as ParentNode;
 const first=hideCaptureElements(root,true),second=hideCaptureElements(root,true);
 expect(root.querySelectorAll).toHaveBeenCalledWith(expect.stringContaining('[data-capture-particle]'));
 expect(display).toEqual({value:'none',priority:'important'});second();expect(display.value).toBe('none');first();expect(display).toEqual({value:'block',priority:''});
});
