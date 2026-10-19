import {expect,it} from 'vitest';
import {generateCanvasSceneHtml} from './canvasSceneHtml';
import {captureTimes,type CaptureScene} from './captureScene';
import {createStarterDiagram} from '../features/onboarding/starterDiagram';
import {playerCopy} from '../i18n/playerCopy';
const scene:CaptureScene={width:800,height:600,dark:false,duration:1001,fps:30,color:'#f8fafc',backgrounds:['data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C/svg%3E'],sprites:[],frames:[{time:0,background:0,particles:[]},{time:1001,background:0,particles:[]}],metrics:{captureMs:0,snapshots:1,frames:2,serializedBytes:0}};
it('uses exact timestamps without adding an extra frame interval to duration',()=>{
 const times=captureTimes(1001,30);expect(times[0]).toBe(0);expect(times.at(-1)).toBe(1001);expect(times).toHaveLength(32);expect(times.every((value,index)=>!index||value>times[index-1])).toBe(true);expect(captureTimes(0,30)).toEqual([0]);
});
it.each([[-1,30],[NaN,30],[1000,0],[1000,61],[Infinity,30]])('rejects invalid capture duration/fps %s %s',(duration,fps)=>expect(()=>captureTimes(duration,fps)).toThrow());
for(const language of ['tr','en'] as const)it(`creates an offline, localized player with safe diagram names in ${language}`,()=>{
 const doc=createStarterDiagram(language);doc.logicalData.nodes[0].name='</script><img src=x onerror=alert(1)>İstek';
 const original=JSON.stringify(doc);
 const html=generateCanvasSceneHtml(scene,doc.logicalData,{'starter-step-1':{start:0,end:1001}},language);
 expect(html.includes(`<html lang="${language}"`)).toBe(true);expect(html.includes(playerCopy[language].play)).toBe(true);expect(html.includes(`aria-label="${playerCopy[language].position}"`)).toBe(true);expect(html.includes(playerCopy[language].zoomIn)).toBe(true);expect(html.includes('&lt;/script&gt;')).toBe(true);expect(html.match(/<script>/g)).toHaveLength(1);expect(html.includes('<img src=x')).toBe(false);
 const code=html.match(/<script>([\s\S]*?)<\/script>/)![1];expect(()=>new Function(code)).not.toThrow();expect(html.includes('fonts.googleapis.com')).toBe(false);expect(html.includes('data:font/woff2;base64,')).toBe(true);expect(JSON.stringify(doc)).toBe(original);
});
