import { mermaidMetadata } from './metadata';
import type { DiagramAdapter, DiagramImportResult, ImportDiagnostic } from './types';
import type { LogicalDiagram, LogicalNode, StickyNote } from '../types';
import type { MermaidArrow, MermaidEvent, MermaidFragmentKind } from '../types/mermaid';
import { generateLayout } from './layoutGenerator';
import { decodeMermaidText } from '../utils/mermaidText';
import { calculateSchedules } from '../store/scheduler';

export class MermaidImportError extends Error {
  constructor(public code: 'empty' | 'unbalanced' | 'invalidBranch' | 'invalidParticipant', public line: number) {
    super(`Mermaid ${code} (line ${line})`);
  }
}

/** Split semicolon statements, retaining escaped entities and quoted text. */
function statements(raw: string) {
  return raw.replace(/^\uFEFF/, '').split(/\r?\n/).flatMap((line, index) => {
    if (line.trim().startsWith('%%')) return [];
    const result: { text: string; line: number }[] = [];
    let current = '', quoted = false;
    for (const character of line) {
      if (character === '"') quoted = !quoted;
      if (character === ';' && !quoted && !/#(?:\d+|quot|amp|lt|gt)$/.test(current)) {
        result.push({ text: current.trim(), line: index + 1 }); current = '';
      } else current += character;
    }
    result.push({ text: current.trim(), line: index + 1 });
    return result.filter(item => item.text && !/^```(?:mermaid)?$/.test(item.text));
  });
}

const identifier = /^[\p{L}\p{N}_][\p{L}\p{N}_.-]*$/u;
const messagePattern = /^([\p{L}\p{N}_][\p{L}\p{N}_.-]*?)\s*(<<-->>|<<->>|-->>|->>|-->|->|--x|-x|--\)|-\))\s*([+-])?\s*([\p{L}\p{N}_][\p{L}\p{N}_.-]*)\s*:\s*(.*)$/u;
const fragmentPattern = /^(alt|opt|loop|par|critical|break|rect)(?:\s+(.*))?$/i;

export function parseMermaidSequence(rawInput: string): DiagramImportResult {
  const logical: LogicalDiagram = { schemaVersion: 2, nodes: [], edges: [], sequences: [], sequenceDiagram: { version: 1, events: [] } };
  const metadata = logical.sequenceDiagram!;
  const participants = new Map<string, LogicalNode>();
  const diagnostics: ImportDiagnostic[] = [];
  const annotations: Record<string, StickyNote> = {};
  const stack: { type: 'box' | 'fragment'; node: LogicalNode; line: number; event?: Extract<MermaidEvent, { type: 'fragment' }> }[] = [];
  const activationDepth = new Map<string, number>();
  let sectionCount = 0, lastSequenceId: string | undefined;
  const noteSteps = new Map<string, string | undefined>();
  const events = (): MermaidEvent[] => {
    const frame = [...stack].reverse().find(item => item.event);
    const branches = frame?.event?.branches;
    return branches?.[branches.length - 1]?.events ?? metadata.events;
  };
  const ensureParticipant = (name: string, line: number): LogicalNode => {
    if (!identifier.test(name)) throw new MermaidImportError('invalidParticipant', line);
    let node = participants.get(name);
    if (!node) {
      node = { id: `node_mermaid_${participants.size}`, name, type: 'service', properties: { mermaidOrder: participants.size } };
      participants.set(name, node); logical.nodes.push(node);
    }
    return node;
  };
  const activate = (participantId: string, active: boolean, line: number) => {
    if (!diagnostics.some(item => item.code === 'approximatePlayback')) diagnostics.push({ code: 'approximatePlayback', line });
    const depth = activationDepth.get(participantId) ?? 0;
    if (!active && depth === 0) {
      diagnostics.push({ code: 'activationMismatch', line });
      return;
    }
    activationDepth.set(participantId, depth + (active ? 1 : -1));
    events().push({ type: 'activation', participantId, active });
  };

  for (const { text, line } of statements(rawInput)) {
    if (/^sequenceDiagram$/i.test(text) || /^sequence-diagram$/i.test(text)) continue;
    const title = text.match(/^title\s*:?\s+(.+)$/i);
    if (title) { metadata.title = decodeMermaidText(title[1]); continue; }
    const autonumber = text.match(/^autonumber(?:\s+(\d+(?:\.\d+)?)(?:\s+(\d+(?:\.\d+)?))?)?$/i);
    if (autonumber) {
      metadata.autonumber = autonumber[1] ? { start: Number(autonumber[1]), ...(autonumber[2] ? { increment: Number(autonumber[2]) } : {}) } : {};
      continue;
    }
    const participant = text.match(/^(participant|actor)\s+(\S+)(?:\s+as\s+(.+))?$/i);
    if (participant) {
      const node = ensureParticipant(participant[2], line);
      node.type = participant[1].toLowerCase() === 'actor' ? 'client' : 'service';
      node.properties!.mermaidActor = participant[1].toLowerCase() === 'actor';
      node.name = decodeMermaidText((participant[3] ?? participant[2]).replace(/^"(.*)"$/, '$1'));
      const box = [...stack].reverse().find(item => item.type === 'box');
      if (box) node.parentId = box.node.id;
      continue;
    }
    const box = text.match(/^box(?:\s+(.*))?$/i);
    if (box) {
      if (stack.length) { diagnostics.push({ code: 'unsupportedStatement', line, source: text }); }
      const content = box[1] ?? '';
      // Recognize actual colors, not arbitrary first words in a group label.
      const color = content.match(/^(transparent|rgba?\([^)]*\)|hsla?\([^)]*\)|red|blue|green|purple|aqua|yellow|orange|pink|gray|grey|black|white)(?:\s+(.*))?$/i);
      const node: LogicalNode = { id: `section_mermaid_${sectionCount++}`, type: 'section', name: decodeMermaidText((color ? color[2] : content) || 'Group'), properties: { mermaidBox: true, boxColor: color?.[1] ?? 'transparent' } };
      logical.nodes.push(node); stack.push({ type: 'box', node, line }); continue;
    }
    const open = text.match(fragmentPattern);
    if (open) {
      const kind = open[1].toLowerCase() as MermaidFragmentKind;
      const label = decodeMermaidText(open[2] ?? '');
      const node: LogicalNode = { id: `section_mermaid_${sectionCount++}`, type: 'section', name: label || kind, properties: { fragmentType: kind, sequenceIds: [] } };
      const event: Extract<MermaidEvent, { type: 'fragment' }> = { type: 'fragment', sectionId: node.id, kind, label, branches: [{ events: [] }] };
      events().push(event); logical.nodes.push(node); stack.push({ type: 'fragment', node, line, event });
      if (kind !== 'rect' && !diagnostics.some(item => item.code === 'approximatePlayback')) diagnostics.push({ code: 'approximatePlayback', line, source: kind });
      continue;
    }
    const branch = text.match(/^(else|and|option)(?:\s+(.*))?$/i);
    if (branch) {
      const frame = stack[stack.length - 1];
      const valid = { else: 'alt', and: 'par', option: 'critical' }[branch[1].toLowerCase()];
      if (!frame?.event || frame.event.kind !== valid) throw new MermaidImportError('invalidBranch', line);
      frame.event.branches.push({ divider: branch[1].toLowerCase() as 'else' | 'and' | 'option', label: decodeMermaidText(branch[2] ?? ''), events: [] });
      continue;
    }
    if (/^end$/i.test(text)) {
      if (!stack.pop()) throw new MermaidImportError('unbalanced', line);
      continue;
    }
    const activation = text.match(/^(activate|deactivate)\s+(\S+)$/i);
    if (activation) { activate(ensureParticipant(activation[2], line).id, activation[1].toLowerCase() === 'activate', line); continue; }
    const note = text.match(/^note\s+(left\s+of|right\s+of|over)\s+([^:]+):\s*(.*)$/i);
    if (note) {
      if (!diagnostics.some(item => item.code === 'approximatePlayback')) diagnostics.push({ code: 'approximatePlayback', line });
      const ids = note[2].split(',').map(name => ensureParticipant(name.trim(), line).id);
      if (ids.length > 2 || (!/^over$/i.test(note[1]) && ids.length !== 1)) { diagnostics.push({ code: 'unsupportedStatement', line, source: text }); continue; }
      const id = `note_mermaid_${Object.keys(annotations).length}`;
      annotations[id] = { id, header: ids.map(id => logical.nodes.find(n => n.id === id)!.name).join(', '), body: decodeMermaidText(note[3]), style: { backgroundColor: '#fef9c3', borderColor: '#fbbf24', textColor: '#78350f', fontFamily: 'Inter', fontSize: 12, borderRadius: 8, opacity: 0.95 }, startTime: 0, endTime: 1000, alwaysVisible: true };
      events().push({ type: 'note', annotationId: id, participantIds: ids, position: note[1].toLowerCase().replace(/\s+/g, ' ') as 'over' | 'left of' | 'right of' });
      noteSteps.set(id, lastSequenceId); continue;
    }
    const message = text.match(messagePattern);
    if (message) {
      const source = ensureParticipant(message[1], line), target = ensureParticipant(message[4], line);
      const arrow = message[2] as MermaidArrow;
      const index = logical.sequences.length, edgeId = `edge_mermaid_${index}`, sequenceId = `step_${index}`;
      const isAsync = arrow.endsWith(')');
      logical.edges.push({ id: edgeId, sourceId: source.id, targetId: target.id, description: decodeMermaidText(message[5]), isAsync, properties: { arrowType: arrow } });
      logical.sequences.push({ id: sequenceId, edgeId, stepNumber: index + 1, isAsync });
      events().push({ type: 'message', sequenceId }); lastSequenceId = sequenceId;
      for (const frame of stack) if (frame.event) (frame.node.properties!.sequenceIds as string[]).push(sequenceId);
      if (message[3] === '+') activate(target.id, true, line);
      if (message[3] === '-') activate(source.id, false, line);
      continue;
    }
    diagnostics.push({ code: 'unsupportedStatement', line, source: text });
  }
  if (stack.length) throw new MermaidImportError('unbalanced', stack[stack.length - 1]!.line);
  if (!participants.size) throw new MermaidImportError('empty', 1);
  if ([...activationDepth.values()].some(depth => depth > 0)) diagnostics.push({ code: 'activationMismatch', line: rawInput.split('\n').length });
  const visual = generateLayout(logical);
  // Mermaid defines order, not elapsed time. Defaults apply only to new imports.
  const sourceReady = new Map<string, number>();
  let floor = 0;
  logical.sequences.forEach((step, index) => {
    const edge = logical.edges[index];
    const base = sourceReady.get(edge.sourceId) ?? floor;
    const start = index * 1000;
    visual.timelines[step.id] = { sequenceId: step.id, duration: 1000, delay: Math.max(0, start - base) };
    if (!step.isAsync) {
      sourceReady.set(edge.targetId, start + 1000);
      floor = Math.max(floor, start + 1000);
    }
  });
  const schedules = calculateSchedules(logical.sequences, visual.timelines, logical.edges, logical.nodes);
  for (const [id, seq] of noteSteps) {
    const schedule = seq ? schedules[seq] : undefined;
    annotations[id].startTime = schedule?.start ?? 0;
    annotations[id].endTime = schedule?.end ?? 1000;
    // Keep sticky notes reachable on the topology canvas.
    visual.layoutNodes[id] = { id, x: 40, y: 120 + Object.keys(visual.layoutNodes).length * 20, width: 220, height: 120 };
  }
  visual.annotations = annotations;
  return { logicalData: logical, visualData: visual, diagnostics };
}

export const mermaidAdapter: DiagramAdapter = {
  ...mermaidMetadata,
  parse: async raw => parseMermaidSequence(raw),
};
