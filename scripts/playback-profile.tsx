import { simulationClock } from '../src/store/simulationClock';
import { SharedPlaybackPanel } from '../src/components/layout/SharedPlaybackPanel';
import { playbackEnd } from '../src/store/playbackModel';
import { renderDiagramFrame, calculateSchedules as calculateCanvasSchedules, calculateViewportBounds } from '../src/utils/canvasRenderer';
// Development-only profiling page. Not imported by the shipped application.
import { generateSvgDataUrl, generatePngDataUrl, exportToGif, exportToVideo, exportToVideoScreenCapture } from '../src/utils/exportMedia';
import React, { Profiler, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DiagramCanvas } from '../src/components/canvas/DiagramCanvas';
import { SequenceDiagramCanvas } from '../src/components/sequence/SequenceDiagramCanvas';
import { usePlaybackLoop } from '../src/components/timeline/hooks/usePlaybackLoop';
import { useAppStore } from '../src/store/useAppStore';
import { calculateSchedules, deriveTopologyIndices } from '../src/store/scheduler';
import '../src/index.css';
import '@xyflow/react/dist/style.css';

let commits = 0, renderMs = 0;
function seed(count: number) {
  useAppStore.getState().stopPlayback();
  const nodes = [{ id: 'section', type: 'section', name: 'Profile section' }, ...Array.from({ length: 20 }, (_, i) => ({ id: `n${i}`, type: 'server', name: `Service ${i}`, parentId: 'section' }))];
  const edges = Array.from({ length: count }, (_, i) => ({ id: `e${i}`, sourceId: `n${i % 20}`, targetId: `n${(i + 1) % 20}`, isAsync: false }));
  const sequences = edges.map((edge, i) => ({ id: `s${i}`, edgeId: edge.id, stepNumber: Math.floor(i / 10) + 1, isAsync: true, isRoundTrip: i % 3 === 0 }));
  const timelines = Object.fromEntries(sequences.map(seq => [seq.id, { sequenceId: seq.id, duration: 1000, delay: 0 }]));
  const logicalData = { schemaVersion: 2, nodes, edges, sequences };
  const visualData = { canvas: { zoom: 0.5, pan: { x: 0, y: 0 } }, layoutNodes: Object.fromEntries(nodes.map((node, i) => [node.id, { id: node.id, x: i ? (i - 1) % 5 * 250 + 30 : 0, y: i ? Math.floor((i - 1) / 5) * 160 + 50 : 0, ...(i ? {} : { width: 1300, height: 750 }) }])), layoutEdges: {}, timelines };
  const schedules = calculateSchedules(sequences, timelines, edges, nodes);
  const indices = deriveTopologyIndices(nodes, edges, {}, sequences, timelines, schedules);
  useAppStore.setState({ logicalData, visualData, schedules, derivedNodeSchedules: indices.nodeSchedules, derivedConnectedPorts: indices.connectedPortsByNode, isDirty: false, selectedSequenceId: null });
}
seed(25);
function PlaybackDriver() {
  const playing = useAppStore(state => state.isPlaying);
  const schedules = useAppStore(state => state.schedules);
  const logical = useAppStore(state => state.logicalData);
  const visual = useAppStore(state => state.visualData);
  usePlaybackLoop(playing, playbackEnd(logical.sequences, visual.timelines, schedules));
  return null;
}
function Profile() {
  const [view, setView] = useState('freeform');
  const [count, setCount] = useState(25);
  const [result, setResult] = useState('Ready');
  const [running, setRunning] = useState(false);
  const [verification, setVerification] = useState('');
  const [image, setImage] = useState('');
  async function checkEncoding(kind: 'gif' | 'video' | 'dom-video') {
    setRunning(true); setVerification('Encoding ' + kind + '…');
    const blobs: Blob[] = [];
    const createObjectURL = URL.createObjectURL;
    URL.createObjectURL = blob => { if (blob instanceof Blob) blobs.push(blob); return createObjectURL(blob); };
    try {
      useAppStore.getState().setCurrentTime(123);
      useAppStore.getState().resumePlayback();
      const progress = () => {};
      if (kind === 'gif') await exportToGif('main', 200, 'release-check.gif', 'en', 5, 60, 0.25, progress);
      else if (kind === 'video') await exportToVideo('main', 200, 'release-check.mp4', 'en', 5, 'low', progress, 0.25);
      else await exportToVideoScreenCapture('main', 200, 'release-dom.mp4', 'en', 5, 'low', progress);
      const result = [];
      for (const blob of blobs) result.push({ type: blob.type, bytes: blob.size, signature: Array.from(new Uint8Array(await blob.slice(0, 12).arrayBuffer())).map(byte => byte.toString(16).padStart(2, '0')).join('') });
      setVerification(JSON.stringify({ encoding: kind, blobs: result, playingRestored: useAppStore.getState().isPlaying, restoredTime: simulationClock.getTime() }));
    } catch (error) { setVerification(String(error)); }
    finally { URL.createObjectURL = createObjectURL; useAppStore.getState().pausePlayback(); setRunning(false); }
  }
  async function checkCanvasRenderer() {
    setRunning(true); setVerification('Rendering Canvas 2D frames…');
    try {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const state = useAppStore.getState();
      const before = JSON.stringify({ logical: state.logicalData, visual: state.visualData });
      const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
      const ctx = canvas.getContext('2d')!;
      const bounds = calculateViewportBounds(state.logicalData, state.visualData);
      const scale = Math.min(canvas.width / bounds.width, canvas.height / bounds.height);
      const schedules = calculateCanvasSchedules(state.logicalData, state.visualData.timelines);
      const start = performance.now();
      for (let frame = 0; frame < 12; frame++) {
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(scale, 0, 0, scale, -bounds.minX * scale, -bounds.minY * scale);
        renderDiagramFrame(ctx, { logicalData: state.logicalData, visualData: state.visualData, libraryComponents: [], schedules, currentTime: frame * 100, theme: 'light', canvasWidth: bounds.width, canvasHeight: bounds.height });
      }
      const elapsed = performance.now() - start;
      setImage(canvas.toDataURL());
      setVerification(JSON.stringify({ renderer: 'Canvas 2D', frames: 12, totalMs: +elapsed.toFixed(2), averageMs: +(elapsed / 12).toFixed(2), unchanged: before === JSON.stringify({ logical: state.logicalData, visual: state.visualData }) }));
    } catch (error) { setVerification(String(error)); }
    finally { setRunning(false); }
  }
  async function seekVisible() {
    const element = document.querySelector(view === 'sequence' ? '.react-flow__edge[data-id^="seq-fwd-"]' : '.react-flow__edge');
    const id = element?.getAttribute('data-id')?.replace(/^seq-(fwd|ret)-/, '');
    const stepId = view === 'sequence' ? id : useAppStore.getState().logicalData.sequences.find(step => step.edgeId === id)?.id;
    const schedule = stepId ? useAppStore.getState().schedules[stepId] : undefined;
    if (!schedule) { setVerification('No visible scheduled message'); return; }
    useAppStore.getState().setCurrentTime(schedule.start + 100);
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const dot = element?.querySelector('circle');
    setVerification(JSON.stringify({ soughtMessage: id, time: schedule.start + 100, dotDisplay: (dot as SVGCircleElement)?.style.display, dotX: dot?.getAttribute('cx'), visibleParticles: [...(element?.querySelectorAll('g[style]') ?? [])].filter(group => (group as SVGGElement).style.display === 'block').length }));
  }
  async function checkExport(format: 'svg' | 'png') {
    setRunning(true); setVerification('Capturing ' + format + '…');
    const before = JSON.stringify({ logical: useAppStore.getState().logicalData, visual: useAppStore.getState().visualData });
    try {
      const data = format === 'svg' ? await generateSvgDataUrl('main') : await generatePngDataUrl('main');
      const messageCount = format === 'svg' ? new DOMParser().parseFromString(decodeURIComponent(data.split(',').slice(1).join(',')), 'image/svg+xml').querySelectorAll('.react-flow__edge').length : null;
      const unchanged = before === JSON.stringify({ logical: useAppStore.getState().logicalData, visual: useAppStore.getState().visualData });
      setImage(data);
      const original = JSON.parse(before);
      const current = useAppStore.getState();
      const changedFields = [...(JSON.stringify(original.logical) !== JSON.stringify(current.logicalData) ? ['logical'] : []), ...Object.keys(original.visual).filter(key => JSON.stringify(original.visual[key]) !== JSON.stringify((current.visualData as any)[key])).map(key => 'visual.' + key)];
      setVerification(JSON.stringify({ format, bytes: data.length, capturedMessages: messageCount, unchanged, changedFields }));
    } catch (error) { setVerification(String(error)); }
    finally { setRunning(false); }
  }
  async function run() {
    setRunning(true); setResult('Measuring for 2 seconds…');
    commits = 0; renderMs = 0;
    const intervals: number[] = [];
    let previous = 0;
    useAppStore.getState().startPlayback();
    let start = 0;
    await new Promise<void>(resolve => {
      function frame(now: number) {
        if (!start) start = now;
        if (previous) intervals.push(now - previous);
        previous = now;
        if (now - start < 2000) requestAnimationFrame(frame); else resolve();
      }
      requestAnimationFrame(frame);
    });
    useAppStore.getState().pausePlayback();
    const sorted = [...intervals].sort((a, b) => a - b);
    const total = intervals.reduce((a, b) => a + b, 0);
    setResult(JSON.stringify({ view, steps: count, frames: intervals.length, fps: +(intervals.length * 1000 / total).toFixed(1), p95FrameMs: +sorted[Math.floor(sorted.length * .95)].toFixed(2), framesOver33ms: intervals.filter(ms => ms > 33).length, reactCommits: commits, reactRenderMs: +renderMs.toFixed(2), heapMB: (performance as any).memory ? +((performance as any).memory.usedJSHeapSize / 1048576).toFixed(1) : null }));
    setRunning(false);
  }
  return <>{view !== 'shared-freeform' && <PlaybackDriver />}<header style={{ padding: 12, background: '#fff', color: '#111', display: 'flex', gap: 15 }}><label>View <select disabled={running} value={view} onChange={event => { setView(event.target.value); useAppStore.getState().setViewMode(event.target.value === 'sequence' ? 'sequence' : 'freeform'); }}><option value="freeform">Freeform</option><option value="sequence">Sequence</option><option value="shared-freeform">Shared freeform</option></select></label><label>Steps <select disabled={running} value={count} onChange={event => { const next = +event.target.value; seed(next); setCount(next); }}><option>25</option><option>250</option><option>1000</option></select></label><button disabled={running} onClick={run}>Measure playback</button><output>{result}</output></header><section style={{ background: '#fff', color: '#111', display: 'flex', gap: 10, padding: 5 }}><button disabled={running} onClick={seekVisible}>Seek visible message</button><button disabled={running} onClick={() => useAppStore.getState().setCurrentTime(1500)}>Seek 1500 ms</button><button disabled={running} onClick={() => useAppStore.getState().setCurrentTime(0)}>Seek start</button><button disabled={running} onClick={() => checkExport('svg')}>Check SVG export</button><button disabled={running} onClick={() => checkExport('png')}>Check PNG export</button><button disabled={running} onClick={checkCanvasRenderer}>Check Canvas 2D renderer</button><button disabled={running} onClick={() => checkEncoding('gif')}>Check GIF encoding</button><button disabled={running} onClick={() => checkEncoding('video')}>Check video encoding</button><button disabled={running} onClick={() => checkEncoding('dom-video')}>Check DOM video encoding</button><span data-testid="export-result">{verification}</span>{image && <a href={image} download={image.startsWith('data:image/png') ? 'profile.png' : 'profile.svg'}>Download checked image</a>}</section><main style={{ height: 'calc(100vh - 90px)' }}><Profiler id="canvas" onRender={(_, __, duration) => { commits++; renderMs += duration; }}>{view !== 'sequence' ? <DiagramCanvas /> : <SequenceDiagramCanvas />}</Profiler></main>{view === 'shared-freeform' && <SharedPlaybackPanel />}</>;
}
const root = createRoot(document.getElementById('root')!);
root.render(<Profile />);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
