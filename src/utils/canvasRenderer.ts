import { LogicalDiagram, VisualDiagram, CustomComponentTemplate } from '../types';

export interface CanvasRenderOptions {
  logicalData: LogicalDiagram;
  visualData: VisualDiagram;
  libraryComponents: CustomComponentTemplate[];
  schedules: Schedule[];
  currentTime: number;
  theme: 'light' | 'dark';
  canvasWidth: number;
  canvasHeight: number;
  skipBackground?: boolean;
}

export interface Schedule {
  id: string;
  stepNumber: number;
  edgeId: string;
  direction: 'forward' | 'reverse';
  isRoundTrip: boolean;
  isAsync: boolean;
  start: number;
  mainEnd: number;
  end: number;
  duration: number;
  internalProcess: { text: string; start: number; end: number; duration: number } | null;
}

export function calculateViewportBounds(
  logicalData: LogicalDiagram,
  visualData: VisualDiagram
): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  logicalData.nodes.forEach((node) => {
    const vis = visualData.layoutNodes[node.id];
    if (!vis) return;
    const x = vis.x;
    const y = vis.y;
    const w = vis.width || 224;
    const h = vis.height || 52;

    // Account for section labels floating above (-30px) and tooltips (-52px)
    const isSection = node.type === 'section';
    const minYOffset = isSection ? -32 : -56;

    if (x < minX) minX = x;
    if (y + minYOffset < minY) minY = y + minYOffset;
    if (x + w > maxX) maxX = x + w;
    if (y + h > maxY) maxY = y + h;
  });

  if (visualData.annotations) {
    Object.values(visualData.annotations).forEach((note: any) => {
      const vis = visualData.layoutNodes[note.id];
      if (vis) {
        const w = vis.width || 200;
        const h = vis.height || 150;
        if (vis.x < minX) minX = vis.x;
        if (vis.y < minY) minY = vis.y;
        if (vis.x + w > maxX) maxX = vis.x + w;
        if (vis.y + h > maxY) maxY = vis.y + h;
      }
    });
  }

  if (minX === Infinity) {
    minX = 0; minY = 0; maxX = 800; maxY = 600;
  }

  // Generous padding around the content box
  const paddingX = 60;
  const paddingY = 60;
  minX -= paddingX;
  minY -= paddingY;
  maxX += paddingX;
  maxY += paddingY;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

export function calculateSchedules(logicalData: LogicalDiagram, timelines: Record<string, any>): Schedule[] {
  const sortedSeqs = [...logicalData.sequences].sort((a, b) => a.stepNumber - b.stepNumber);
  const schedules: Schedule[] = [];
  
  const edgeMap: Record<string, any> = {};
  logicalData.edges.forEach(e => { edgeMap[e.id] = e; });

  const seqNodes: Record<string, { src: string; tgt: string }> = {};
  sortedSeqs.forEach(seq => {
    const edge = edgeMap[seq.edgeId];
    const direction = (seq as any).direction || 'forward';
    const src = edge ? (direction === 'reverse' ? edge.targetId : edge.sourceId) : '';
    const tgt = edge ? (direction === 'reverse' ? edge.sourceId : edge.targetId) : '';
    seqNodes[seq.id] = { src, tgt };
  });

  const childrenOf: Record<string, any[]> = {};
  const nested: Record<string, boolean> = {};
  const activeRTTargets: Record<string, string> = {};

  sortedSeqs.forEach(seq => {
    const src = seqNodes[seq.id].src;
    const parentId = src ? activeRTTargets[src] : undefined;

    if (parentId) {
      nested[seq.id] = true;
      if (!childrenOf[parentId]) childrenOf[parentId] = [];
      childrenOf[parentId].push(seq);
    }

    if (seq.isRoundTrip) {
      const tgt = seqNodes[seq.id].tgt;
      if (tgt) activeRTTargets[tgt] = seq.id;
    }
  });

  function processStep(seq: any, startTime: number): number {
    const tConf = timelines[seq.id] || { duration: 1000, delay: 0 };
    const duration = tConf.duration ?? 1000;
    const children = childrenOf[seq.id] || [];

    if (!seq.isRoundTrip && children.length === 0) {
      const internalProcess = tConf.internalProcess ? {
        text: tConf.internalProcess.text,
        start: startTime + duration,
        end: startTime + duration + (tConf.internalProcess.duration ?? 1000),
        duration: tConf.internalProcess.duration ?? 1000
      } : null;

      schedules.push({
        id: seq.id, stepNumber: seq.stepNumber, edgeId: seq.edgeId,
        direction: seq.direction || 'forward', isRoundTrip: false,
        isAsync: seq.isAsync || false, start: startTime,
        mainEnd: startTime + duration, end: startTime + duration,
        duration: duration, internalProcess
      });
      return startTime + duration;
    }

    const halfTransit = duration / 2;
    const forwardReach = startTime + halfTransit;
    const ipDur = tConf.internalProcess ? (tConf.internalProcess.duration ?? 1000) : 0;

    const childGroups: Record<number, any[]> = {};
    children.forEach(c => {
      if (!childGroups[c.stepNumber]) childGroups[c.stepNumber] = [];
      childGroups[c.stepNumber].push(c);
    });

    let childReadyTime = forwardReach + ipDur;
    let latestSyncEnd = childReadyTime;

    Object.keys(childGroups).map(Number).sort((a, b) => a - b).forEach(gn => {
      const group = childGroups[gn];
      const snapshot = childReadyTime;

      group.forEach(child => {
        const childTiming = timelines[child.id] || { duration: 1000, delay: 0 };
        const childDelay = childTiming.delay ?? 0;
        const childStart = snapshot + childDelay;
        const childEnd = processStep(child, childStart);

        if (!child.isAsync) {
          if (childEnd > childReadyTime) childReadyTime = childEnd;
          if (childEnd > latestSyncEnd) latestSyncEnd = childEnd;
        }
      });
    });

    const returnStart = latestSyncEnd;
    const totalEnd = returnStart + halfTransit;

    const internalProcess = tConf.internalProcess ? {
      text: tConf.internalProcess.text,
      start: forwardReach,
      end: forwardReach + ipDur,
      duration: ipDur
    } : null;

    schedules.push({
      id: seq.id, stepNumber: seq.stepNumber, edgeId: seq.edgeId,
      direction: seq.direction || 'forward', isRoundTrip: true,
      isAsync: seq.isAsync || false, start: startTime,
      mainEnd: startTime + duration, end: totalEnd,
      duration: duration, internalProcess
    });
    return totalEnd;
  }

  const rootSteps = sortedSeqs.filter(seq => !nested[seq.id]);
  const rootGroups: Record<number, any[]> = {};
  rootSteps.forEach(seq => {
    if (!rootGroups[seq.stepNumber]) rootGroups[seq.stepNumber] = [];
    rootGroups[seq.stepNumber].push(seq);
  });

  const nodeEndTime: Record<string, number> = {};
  let globalFloor = 0;

  Object.keys(rootGroups).map(Number).sort((a, b) => a - b).forEach(gn => {
    const group = rootGroups[gn];
    let maxSyncEnd = globalFloor;

    group.forEach(seq => {
      const { src, tgt } = seqNodes[seq.id];
      const tConf = timelines[seq.id] || { duration: 1000, delay: 0 };
      const delay = tConf.delay ?? 0;

      const sourceChainEnd = nodeEndTime[src];
      const baseStart = sourceChainEnd !== undefined ? sourceChainEnd : globalFloor;
      const startTime = baseStart + delay;

      const totalEnd = processStep(seq, startTime);

      if (!seq.isAsync && tgt) {
        nodeEndTime[tgt] = Math.max(nodeEndTime[tgt] || 0, totalEnd);
      }

      if (!seq.isAsync && totalEnd > maxSyncEnd) {
        maxSyncEnd = totalEnd;
      }
    });

    globalFloor = maxSyncEnd;
  });

  return schedules.sort((a, b) => a.start - b.start);
}

// Helpers for rendering
function getAbsolutePos(nodeId: string, logicalData: LogicalDiagram, visualData: VisualDiagram) {
  const layout = visualData.layoutNodes;
  const node = logicalData.nodes.find(n => n.id === nodeId);
  const vis = layout[nodeId] || { x: 0, y: 0, width: 224, height: 52 };
  if (node && node.parentId) {
    const parentVis = layout[node.parentId] || { x: 0, y: 0 };
    return { x: vis.x + parentVis.x, y: vis.y + parentVis.y, width: vis.width || 224, height: vis.height || 52 };
  }
  return { x: vis.x, y: vis.y, width: vis.width || 224, height: vis.height || 52 };
}

function calculateBezierCoords(edge: any, logicalData: LogicalDiagram, visualData: VisualDiagram) {
  const sourceId = edge.sourceId;
  const targetId = edge.targetId;
  const ve = visualData.layoutEdges?.[edge.id] || {};
  const rawSourcePort = ve.sourceHandle || 'right:50';
  const rawTargetPort = ve.targetHandle || 'left:50';

  function parsePort(portId: string) {
    const parts = portId.split(':');
    return { side: parts[0], offset: parts.length > 1 ? Number(parts[1]) : 50 };
  }

  const sourcePort = parsePort(rawSourcePort);
  const targetPort = parsePort(rawTargetPort);

  const sAbs = getAbsolutePos(sourceId, logicalData, visualData);
  const tAbs = getAbsolutePos(targetId, logicalData, visualData);
  
  const sW = sAbs.width;
  const sH = sAbs.height;
  const tW = tAbs.width;
  const tH = tAbs.height;

  let sX = sAbs.x, sY = sAbs.y;
  if (sourcePort.side === 'left') { sY += sH * (sourcePort.offset / 100); }
  else if (sourcePort.side === 'right') { sX += sW; sY += sH * (sourcePort.offset / 100); }
  else if (sourcePort.side === 'top') { sX += sW * (sourcePort.offset / 100); }
  else { sX += sW * (sourcePort.offset / 100); sY += sH; }

  let tX = tAbs.x, tY = tAbs.y;
  if (targetPort.side === 'left') { tY += tH * (targetPort.offset / 100); }
  else if (targetPort.side === 'right') { tX += tW; tY += tH * (targetPort.offset / 100); }
  else if (targetPort.side === 'top') { tX += tW * (targetPort.offset / 100); }
  else { tX += tW * (targetPort.offset / 100); tY += tH; }

  const siblings = logicalData.edges.filter(
    e => (e.sourceId === edge.sourceId && e.targetId === edge.targetId) || (e.sourceId === edge.targetId && e.targetId === edge.sourceId)
  ).sort((a, b) => {
    const aSeqs = logicalData.sequences.filter(s => s.edgeId === a.id);
    const bSeqs = logicalData.sequences.filter(s => s.edgeId === b.id);
    const aMinStep = aSeqs.length > 0 ? Math.min(...aSeqs.map(s => s.stepNumber)) : 999;
    const bMinStep = bSeqs.length > 0 ? Math.min(...bSeqs.map(s => s.stepNumber)) : 999;
    if (aMinStep !== bMinStep) return aMinStep - bMinStep;
    return a.id.localeCompare(b.id);
  });

  const total = siblings.length;
  const index = siblings.findIndex(e => e.id === edge.id);

  let offset = 0;
  if (total > 1 && index >= 0) {
    const step = 30;
    const start = -((total - 1) * step) / 2;
    offset = start + index * step;
  }
  if (edge.sourceId > edge.targetId) {
    offset = -offset;
  }

  const dx = tX - sX;
  const dy = tY - sY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  const nx = -dy / len;
  const ny = dx / len;

  const controlOffset = Math.max(30, len * 0.3);

  let c1x = sX, c1y = sY;
  let c2x = tX, c2y = tY;

  if (sourcePort.side === 'left') c1x -= controlOffset;
  else if (sourcePort.side === 'right') c1x += controlOffset;
  else if (sourcePort.side === 'top') c1y -= controlOffset;
  else if (sourcePort.side === 'bottom') c1y += controlOffset;

  if (targetPort.side === 'left') c2x -= controlOffset;
  else if (targetPort.side === 'right') c2x += controlOffset;
  else if (targetPort.side === 'top') c2y -= controlOffset;
  else if (targetPort.side === 'bottom') c2y += controlOffset;

  c1x += nx * offset;
  c1y += ny * offset;
  c2x += nx * offset;
  c2y += ny * offset;

  return { sX, sY, c1x, c1y, c2x, c2y, tX, tY };
}

function getBezierPoint(t: number, p0x: number, p0y: number, p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  let x = uuu * p0x; 
  x += 3 * uu * t * p1x; 
  x += 3 * u * tt * p2x; 
  x += ttt * p3x; 

  let y = uuu * p0y;
  y += 3 * uu * t * p1y;
  y += 3 * u * tt * p2y;
  y += ttt * p3y;

  return { x, y };
}

function renderNodeIcon(ctx: CanvasRenderingContext2D, type: string, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  if (type === 'client') {
    ctx.roundRect(2, 3, 20, 14, 2);
    ctx.moveTo(8, 21); ctx.lineTo(16, 21);
    ctx.moveTo(12, 17); ctx.lineTo(12, 21);
  } else if (type === 'gateway') {
    ctx.roundRect(16, 16, 6, 6, 1);
    ctx.roundRect(2, 16, 6, 6, 1);
    ctx.roundRect(9, 2, 6, 6, 1);
    ctx.moveTo(12, 8); ctx.lineTo(12, 16);
    ctx.moveTo(5, 16); ctx.lineTo(5, 12); ctx.arcTo(5, 10, 7, 10, 2); ctx.lineTo(17, 10); ctx.arcTo(19, 10, 19, 12, 2); ctx.lineTo(19, 16);
  } else if (type === 'server') {
    ctx.roundRect(2, 2, 20, 8, 2);
    ctx.roundRect(2, 14, 20, 8, 2);
    ctx.moveTo(6, 6); ctx.lineTo(6.01, 6);
    ctx.moveTo(6, 18); ctx.lineTo(6.01, 18);
  } else if (type === 'database') {
    ctx.ellipse(12, 5, 9, 3, 0, 0, Math.PI * 2);
    ctx.moveTo(3, 5); ctx.lineTo(3, 19);
    ctx.bezierCurveTo(3, 20.66, 7, 22, 12, 22);
    ctx.bezierCurveTo(17, 22, 21, 20.66, 21, 19);
    ctx.lineTo(21, 5);
    ctx.moveTo(3, 12);
    ctx.bezierCurveTo(3, 13.66, 7, 15, 12, 15);
    ctx.bezierCurveTo(17, 15, 21, 13.66, 21, 12);
  } else if (type === 'cache') {
    ctx.moveTo(13, 2); ctx.lineTo(3, 14); ctx.lineTo(12, 14); ctx.lineTo(11, 22); ctx.lineTo(21, 10); ctx.lineTo(12, 10); ctx.lineTo(13, 2);
  } else if (type === 'queue') {
    ctx.moveTo(3, 16); ctx.lineTo(7, 20); ctx.lineTo(11, 16);
    ctx.moveTo(21, 8); ctx.lineTo(17, 4); ctx.lineTo(13, 8);
    ctx.moveTo(3, 16); ctx.lineTo(21, 16);
    ctx.moveTo(21, 8); ctx.lineTo(3, 8);
  } else {
    ctx.roundRect(4, 4, 16, 16, 2);
  }
  ctx.stroke();
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number | number[]) {
  if (typeof radius === 'number') {
    radius = [radius, radius, radius, radius];
  }
  ctx.beginPath();
  ctx.moveTo(x + radius[0], y);
  ctx.lineTo(x + width - radius[1], y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius[1]);
  ctx.lineTo(x + width, y + height - radius[2]);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius[2], y + height);
  ctx.lineTo(x + radius[3], y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius[3]);
  ctx.lineTo(x, y + radius[0]);
  ctx.quadraticCurveTo(x, y, x + radius[0], y);
  ctx.closePath();
}

export function renderDiagramFrame(ctx: CanvasRenderingContext2D, options: CanvasRenderOptions): void {
  const { logicalData, visualData, libraryComponents: _libraryComponents, schedules, currentTime, theme, canvasWidth, canvasHeight, skipBackground } = options;
  const isDark = theme === 'dark';
  
  if (!skipBackground) {
    const bgColor = visualData.canvas?.bgColor || (isDark ? '#0b0f19' : '#f1f5f9');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    if (visualData.canvas?.gridVisible !== false) {
      ctx.fillStyle = isDark ? '#334155' : '#cbd5e1';
      for (let x = 0; x < canvasWidth; x += 16) {
        for (let y = 0; y < canvasHeight; y += 16) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  
  const themeColors: Record<string, string> = {
    white: '#ffffff', slate: '#64748b', indigo: '#6366f1',
    emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
    violet: '#8b5cf6', cyan: '#06b6d4'
  };

  // Determine active states for simulation
  const activeNodes = new Set<string>();
  const processingNodes = new Set<string>();
  const activeEdges = new Set<string>();
  
  const currentSchedules = schedules.filter(s => currentTime >= s.start && currentTime <= s.end);
  const activeSequences: any[] = [];
  
  for (const s of currentSchedules) {
    const seq = logicalData.sequences.find(q => q.id === s.id);
    if (!seq) continue;
    activeSequences.push({ s, seq });
    const edge = logicalData.edges.find(e => e.id === seq.edgeId);
    if (edge) activeEdges.add(edge.id);

    if (s.internalProcess && currentTime >= s.internalProcess.start && currentTime <= s.internalProcess.end) {
      const tgtId = s.direction === 'reverse' ? edge?.sourceId : edge?.targetId;
      if (tgtId) processingNodes.add(tgtId);
    }
    
    if (edge) {
      const elapsed = currentTime - s.start;
      const transitDone = s.isRoundTrip ? (elapsed >= s.duration / 2) : (elapsed >= s.duration);
      if (transitDone) {
        const tgtId = s.direction === 'reverse' ? edge.sourceId : edge.targetId;
        const tgtNode = logicalData.nodes.find(n => n.id === tgtId);
        if (tgtNode?.type === 'section') processingNodes.add(tgtId);
      }
    }

    if (edge) {
      const srcId = s.direction === 'reverse' ? edge.targetId : edge.sourceId;
      const tgtId = s.direction === 'reverse' ? edge.sourceId : edge.targetId;
      const elapsed = currentTime - s.start;
      if (s.isRoundTrip) {
        const halfT = s.duration / 2;
        const returnEl = s.end - s.start - halfT;
        if (elapsed < halfT || elapsed >= returnEl) activeNodes.add(srcId);
        if (elapsed >= halfT && elapsed < returnEl) activeNodes.add(tgtId);
      } else {
        if (elapsed < s.duration) activeNodes.add(srcId);
        if (elapsed >= s.duration) activeNodes.add(tgtId);
      }
    }
  }

  // Draw Sections
  const sections = logicalData.nodes.filter(n => n.type === 'section');
  for (const section of sections) {
    const vis = visualData.layoutNodes[section.id];
    if (!vis) continue;
    const absPos = getAbsolutePos(section.id, logicalData, visualData);
    
    ctx.save();
    const isProcessing = processingNodes.has(section.id);
    let borderColor = isProcessing ? '#10b981' : (themeColors[vis.theme || 'slate'] || '#64748b');
    let bgOpacity = vis.customStyles?.bgOpacity ?? 0.1;
    
    ctx.globalAlpha = bgOpacity;
    ctx.fillStyle = borderColor;
    roundRect(ctx, absPos.x, absPos.y, absPos.width, absPos.height, 12);
    ctx.fill();
    ctx.globalAlpha = 1;
    
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = isProcessing ? 3 : 2;
    if (vis.customStyles?.borderStyle !== 'solid') {
      ctx.setLineDash(vis.customStyles?.borderStyle === 'dotted' ? [2, 4] : [6, 6]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Label
    ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(section.name.toUpperCase(), absPos.x + 12, absPos.y - 22);
    ctx.restore();
  }

  // Draw Edges
  for (const edge of logicalData.edges) {
    const coords = calculateBezierCoords(edge, logicalData, visualData);
    if (!coords) continue;
    const isActive = activeEdges.has(edge.id);
    
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(coords.sX, coords.sY);
    ctx.bezierCurveTo(coords.c1x, coords.c1y, coords.c2x, coords.c2y, coords.tX, coords.tY);
    
    if (edge.isAsync) ctx.setLineDash([5, 5]);
    ctx.strokeStyle = isActive ? '#6366f1' : (visualData.layoutEdges?.[edge.id]?.color || (isDark ? '#1e293b' : '#e2e8f0'));
    ctx.lineWidth = isActive ? 3.5 : 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrowhead
    const ve = visualData.layoutEdges?.[edge.id];
    if (ve?.showArrow !== false) {
      // rough tangent calculation at t=1
      const p2x = coords.c2x, p2y = coords.c2y, p3x = coords.tX, p3y = coords.tY;
      const angle = Math.atan2(p3y - p2y, p3x - p2x);
      ctx.translate(coords.tX, coords.tY);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-8, -4);
      ctx.lineTo(-8, 4);
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
      ctx.rotate(-angle);
      ctx.translate(-coords.tX, -coords.tY);
    }
    ctx.restore();
    
    // Badge
    const edgeSeqs = logicalData.sequences.filter(seq => seq.edgeId === edge.id).sort((a, b) => a.stepNumber - b.stepNumber);
    if (edgeSeqs.length > 0) {
      const midPt = getBezierPoint(0.5, coords.sX, coords.sY, coords.c1x, coords.c1y, coords.c2x, coords.c2y, coords.tX, coords.tY);
      const stepNums = edgeSeqs.map(s => s.stepNumber).sort((a, b) => a - b).filter((value, index, self) => self.indexOf(value) === index);
      const stepText = stepNums.length > 0 ? stepNums.join(',') + (edge.protocol ? ` - [${edge.protocol}]` : '') : '';
      
      ctx.save();
      ctx.font = 'bold 9px monospace';
      const textW = ctx.measureText(stepText).width;
      const badgeW = Math.max(22, textW + 12);
      const badgeH = 16;
      
      ctx.fillStyle = isActive ? '#6366f1' : '#1e293b';
      ctx.strokeStyle = isActive ? '#818cf8' : '#475569';
      ctx.lineWidth = 1.5;
      
      roundRect(ctx, midPt.x - badgeW/2, midPt.y - badgeH/2, badgeW, badgeH, 8);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stepText, midPt.x, midPt.y + 0.5);
      ctx.restore();
    }
  }

  // Draw Nodes
  const regularNodes = logicalData.nodes.filter(n => n.type !== 'section');
  for (const node of regularNodes) {
    const vis = visualData.layoutNodes[node.id];
    if (!vis) continue;
    const absPos = getAbsolutePos(node.id, logicalData, visualData);
    
    const isActive = activeNodes.has(node.id);
    const isProcessing = processingNodes.has(node.id);
    
    ctx.save();
    
    if (isProcessing) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#10b981';
      ctx.strokeStyle = '#10b981';
    } else if (isActive) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#6366f1';
      ctx.strokeStyle = '#6366f1';
    } else {
      ctx.shadowBlur = 15;
      ctx.shadowColor = isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)';
      ctx.strokeStyle = themeColors[vis.theme || 'slate'] || '#64748b';
      ctx.globalAlpha = 0.6; // Border opacity
    }

    if (vis.displayMode === 'icon-only') {
      ctx.fillStyle = 'transparent';
      ctx.strokeStyle = 'transparent';
      ctx.shadowColor = 'transparent';
    } else {
      ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
    }
    
    ctx.lineWidth = 2;
    roundRect(ctx, absPos.x, absPos.y, absPos.width, absPos.height, 12);
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.stroke();
    ctx.shadowBlur = 0; // reset shadow
    
    // Scale calculations
    const scale = Math.max(0.5, Math.min(absPos.width / 224, absPos.height / 52, 4.0));
    const iconBoxSize = Math.round(36 * scale);
    
    if (vis.displayMode !== 'icon-only') {
      // Icon Box
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
      const bx = absPos.x + 8 * scale;
      const by = absPos.y + (absPos.height - iconBoxSize) / 2;
      roundRect(ctx, bx, by, iconBoxSize, iconBoxSize, 8);
      ctx.fill();
      
      const iconColor = themeColors[vis.theme || 'slate'] || '#64748b';
      renderNodeIcon(ctx, node.type, bx + (iconBoxSize - 24 * scale) / 2, by + (iconBoxSize - 24 * scale) / 2, 24 * scale, iconColor);
      
      // Text
      ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
      const titleFontSize = Math.max(8, Math.round(13 * scale));
      ctx.font = `600 ${titleFontSize}px "Outfit", sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(node.name, bx + iconBoxSize + 12 * scale, absPos.y + absPos.height / 2 + 2);
      
      ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
      const subFontSize = Math.max(7, Math.round(9 * scale));
      ctx.font = `700 ${subFontSize}px sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(node.type.toUpperCase(), bx + iconBoxSize + 12 * scale, absPos.y + absPos.height / 2 + 4);
    } else {
      // Icon only
      const bx = absPos.x + (absPos.width - iconBoxSize) / 2;
      const by = absPos.y + (absPos.height - iconBoxSize) / 2;
      const iconColor = themeColors[vis.theme || 'slate'] || '#64748b';
      renderNodeIcon(ctx, node.type, bx, by, iconBoxSize, iconColor);
    }

    // Handles
    if (vis.handles) {
      ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      for (const h of vis.handles) {
        let hx = absPos.x, hy = absPos.y;
        if (h.side === 'left') { hy += absPos.height * (h.offset / 100); }
        else if (h.side === 'right') { hx += absPos.width; hy += absPos.height * (h.offset / 100); }
        else if (h.side === 'top') { hx += absPos.width * (h.offset / 100); }
        else { hx += absPos.width * (h.offset / 100); hy += absPos.height; }
        
        ctx.beginPath();
        ctx.arc(hx, hy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }

  // Draw Annotations (Sticky notes)
  if (visualData.annotations) {
    for (const noteId of Object.keys(visualData.annotations)) {
      const note = visualData.annotations[noteId];
      if (note.startTime !== undefined && note.endTime !== undefined && !note.alwaysVisible) {
        if (currentTime < note.startTime || currentTime > note.endTime) continue;
      }
      
      const vis = visualData.layoutNodes[note.id];
      if (!vis) continue;
      const absPos = getAbsolutePos(note.id, logicalData, visualData);
      
      ctx.save();
      const style = note.style;
      ctx.globalAlpha = style.opacity ?? 1.0;
      if (style.shadow) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
      }
      
      // Note background
      ctx.fillStyle = style.backgroundColor;
      roundRect(ctx, absPos.x, absPos.y, absPos.width, absPos.height, style.borderRadius || 0);
      ctx.fill();
      
      // Header
      if (style.headerColor) {
        ctx.fillStyle = style.headerColor;
        roundRect(ctx, absPos.x, absPos.y, absPos.width, 24, [style.borderRadius || 0, style.borderRadius || 0, 0, 0]);
        ctx.fill();
      }
      
      ctx.strokeStyle = style.borderColor;
      ctx.lineWidth = 1;
      roundRect(ctx, absPos.x, absPos.y, absPos.width, absPos.height, style.borderRadius || 0);
      ctx.stroke();
      
      // Folded corner
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath();
      ctx.moveTo(absPos.x + absPos.width - 16, absPos.y + absPos.height);
      ctx.lineTo(absPos.x + absPos.width, absPos.y + absPos.height - 16);
      ctx.lineTo(absPos.x + absPos.width, absPos.y + absPos.height);
      ctx.fill();

      // Text
      ctx.fillStyle = style.textColor;
      ctx.font = `bold ${style.fontSize || 14}px ${style.fontFamily || 'sans-serif'}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      if (note.header) {
        ctx.fillText(note.header, absPos.x + 8, absPos.y + 4);
      }
      ctx.font = `${style.fontSize || 14}px ${style.fontFamily || 'sans-serif'}`;
      ctx.fillText(note.body, absPos.x + 8, absPos.y + (style.headerColor ? 28 : 8));
      
      ctx.restore();
    }
  }

  // Draw Particles
  for (const { s, seq } of activeSequences) {
    const edge = logicalData.edges.find(e => e.id === seq.edgeId);
    if (!edge) continue;
    const coords = calculateBezierCoords(edge, logicalData, visualData);
    if (!coords) continue;
    
    const elapsed = currentTime - s.start;
    let actualProgress = 0;
    
    if (s.isRoundTrip) {
      const transitHalf = s.duration / 2;
      const returnStartElapsed = (s.end - s.start) - transitHalf;
      if (elapsed < transitHalf) {
        actualProgress = Math.min(Math.max(elapsed / transitHalf, 0), 1);
      } else if (elapsed < returnStartElapsed) {
        actualProgress = 1.0;
      } else {
        const returnElapsed = elapsed - returnStartElapsed;
        actualProgress = 1.0 - Math.min(Math.max(returnElapsed / transitHalf, 0), 1);
      }
    } else {
      actualProgress = Math.min(Math.max(elapsed / s.duration, 0), 1);
    }
    
    const pointProgress = seq.direction === 'reverse' ? (1 - actualProgress) : actualProgress;
    const pt = getBezierPoint(pointProgress, coords.sX, coords.sY, coords.c1x, coords.c1y, coords.c2x, coords.c2y, coords.tX, coords.tY);
    
    ctx.save();
    // Glow
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 16, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(129, 140, 248, 0.3)';
    ctx.fill();
    
    // Main Ball
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#4f46e5';
    ctx.fill();
    
    // Center
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    
    // Text
    ctx.fillStyle = '#1e293b';
    ctx.font = '900 8.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(seq.stepNumber.toString(), pt.x, pt.y + 0.5);
    ctx.restore();
  }

  // Draw Tooltips
  for (const { s, seq } of activeSequences) {
    if (s.internalProcess && currentTime >= s.internalProcess.start && currentTime <= s.internalProcess.end) {
      const edge = logicalData.edges.find(e => e.id === seq.edgeId);
      if (!edge) continue;
      const tgtId = s.direction === 'reverse' ? edge.sourceId : edge.targetId;
      const absPos = getAbsolutePos(tgtId, logicalData, visualData);
      
      ctx.save();
      const text = s.internalProcess.text;
      ctx.font = '12px sans-serif';
      const textW = ctx.measureText(text).width;
      const tooltipW = textW + 24;
      const tooltipH = 28;
      
      const tx = absPos.x + absPos.width / 2;
      const ty = absPos.y - tooltipH - 8;
      
      ctx.fillStyle = '#4f46e5';
      roundRect(ctx, tx - tooltipW/2, ty, tooltipW, tooltipH, 6);
      ctx.fill();
      
      // Arrow
      ctx.beginPath();
      ctx.moveTo(tx - 6, ty + tooltipH);
      ctx.lineTo(tx + 6, ty + tooltipH);
      ctx.lineTo(tx, ty + tooltipH + 6);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, tx, ty + tooltipH / 2);
      ctx.restore();
    }
  }
}
