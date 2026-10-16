// Compiled only into the explicitly enabled startup measurement build.
const navigation=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
const report: Record<string, unknown>={userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight},timeOrigin:performance.timeOrigin,ttfbMs:navigation?.responseStart,headingReadyMs:null,firstContentfulPaintMs:null,lcpMs:null,cls:0,longTasks:0};
const panel=document.createElement('details');
panel.style.cssText='position:fixed;bottom:12px;right:12px;z-index:20000;width:min(420px,90vw);max-height:60vh;overflow:auto;background:#101827;color:#e5e7eb;border:1px solid #64748b;border-radius:12px;padding:12px;font:12px monospace';
const title=document.createElement('summary');title.textContent='Startup measurement';
const output=document.createElement('pre');output.style.whiteSpace='pre-wrap';
panel.append(title,output);document.body.append(panel);
const update=()=>{output.textContent=JSON.stringify(report,null,2);};
for(const type of ['paint','largest-contentful-paint','layout-shift','longtask']) {
  if(!PerformanceObserver.supportedEntryTypes.includes(type))continue;
  new PerformanceObserver(list=>{for(const entry of list.getEntries()){
    if(entry.name==='first-contentful-paint')report.firstContentfulPaintMs=entry.startTime;
    if(type==='largest-contentful-paint')report.lcpMs=entry.startTime;
    if(type==='layout-shift'&&!(entry as PerformanceEntry & {hadRecentInput:boolean}).hadRecentInput)report.cls=Number(report.cls)+(entry as PerformanceEntry & {value:number}).value;
    if(type==='longtask')report.longTasks=Number(report.longTasks)+1;
  }update();}).observe({type,buffered:true});
}
let scheduled = false;
const observer=new MutationObserver(()=>{if(document.querySelector('#welcome-title')&&report.headingReadyMs===null&&!scheduled){
  scheduled=true;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    report.headingReadyMs=performance.now();
    report.resources=performance.getEntriesByType('resource').map(entry=>{const resource=entry as PerformanceResourceTiming;return {name:new URL(resource.name).pathname,transferBytes:resource.transferSize,durationMs:resource.duration};});
    report.transferBytes=(report.resources as {transferBytes:number}[]).reduce((sum,item)=>sum+item.transferBytes,0)+(navigation?.transferSize??0);
    update();observer.disconnect();
    setTimeout(()=>{report.settled=true;update();},1000);
  }));
}});
observer.observe(document.body,{childList:true,subtree:true});update();

export {};
