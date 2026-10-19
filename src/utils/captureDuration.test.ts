import {expect,it} from 'vitest';
import {canvasCaptureDuration} from './captureDuration';
import {createStarterDiagram} from '../features/onboarding/starterDiagram';
it('includes one-way internal work and timed notes without extending for permanent notes',()=>{
 const {logicalData,visualData}=createStarterDiagram('en');logicalData.sequences[0].isRoundTrip=false;
 visualData.timelines['starter-step-1'].internalProcess={text:'Work',duration:3000};
 const schedules={'starter-step-1':{start:0,end:6000}};
 expect(canvasCaptureDuration(logicalData,visualData,schedules)).toBe(9500);
 visualData.annotations={note:{id:'note',header:'Note',body:'',startTime:0,endTime:10000,alwaysVisible:false} as any};
 expect(canvasCaptureDuration(logicalData,visualData,schedules)).toBe(10500);
 visualData.annotations.note.alwaysVisible=true;
 expect(canvasCaptureDuration(logicalData,visualData,schedules)).toBe(9500);
});
