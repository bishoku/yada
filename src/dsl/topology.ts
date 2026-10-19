import { topologyNodeTypes } from './syntax';
import type { LogicalDiagram, LogicalNode, LogicalEdge, SequenceStep, VisualDiagram } from '../types';
import { layoutDiagram } from '../utils/layout';
import { generateLayout } from '../adapters/layoutGenerator';

/** Optional document metadata: old schema-v2 projects need no migration. */
export interface DslDocument {
  version: 1;
  source: string;
  draft?: string;
  draftBase?: string;
  nodeIds: Record<string, string>;
  edgeIds: Record<string, string>;
}
export class DslError extends Error {
  constructor(public line: number, message: string) { super(message); }
}
type Token = { text: string; start: number; end: number };
type Declaration = { kind: 'node' | 'edge'; id: string; line: number; tokens: Token[]; parent?: string };
export interface ParsedTopology {
  nodes: LogicalNode[];
  edges: Array<LogicalEdge & { step?: number; duration?: number; repeat?: number; roundtrip?: boolean }>;
  declarations: Declaration[];
  lines: string[];
}
const idPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;
const types = topologyNodeTypes;
function lex(line: string, number: number): Token[] {
  const tokens: Token[] = [];
  const re = /\s+|%%.*$|"(?:\\.|[^"\\])*"|-->|~>|[{}\[\],:=@]|[A-Za-z0-9_.-]+/gy;
  let position = 0;
  while (position < line.length) {
    re.lastIndex = position;
    const match = re.exec(line);
    if (!match) throw new DslError(number, `Unexpected character: ${line[position]}`);
    position = re.lastIndex;
    if (match[0].startsWith('%%')) break;
    if (!/^\s+$/.test(match[0])) tokens.push({ text: match[0], start: match.index, end: position });
  }
  return tokens;
}
export function parseTopology(source: string): ParsedTopology {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const nodes: LogicalNode[] = [], edges: ParsedTopology['edges'] = [], declarations: Declaration[] = [];
  const groups: string[] = [], ids = new Set<string>();
  let header = false;
  lines.forEach((line, index) => {
    const n = index + 1, tokens = lex(line, n), words = tokens.map(t => t.text);
    if (!words.length) return;
    const fail = (message: string): never => { throw new DslError(n, message); };
    const identifier = (value: string | undefined) => value && idPattern.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value) ? value : fail('Expected an identifier (letters, digits, underscores).');
    const quoted = (value: string | undefined): string => {
      if (!value?.startsWith('"')) return fail('Expected a quoted label.');
      try { return JSON.parse(value); } catch { return fail('Invalid quoted string.'); }
    };
    const unique = (id: string) => { if (ids.has(id)) fail(`Duplicate identifier: ${id}`); ids.add(id); };
    if (!header) {
      if (words.join(' ') !== 'yada 1') fail('Start with yada 1.');
      header = true; return;
    }
    if (words[0] === '}') {
      if (words.length !== 1 || !groups.pop()) fail('Unexpected closing brace.');
      return;
    }
    if (words[1] === '-->' || words[1] === '~>') {
      if (groups.length) fail('Declare connections outside group blocks.');
      let cursor = 0;
      const sourceId = identifier(words[cursor++]), isAsync = words[cursor++] === '~>', targetId = identifier(words[cursor++]);
      let description = '';
      if (words[cursor] === ':') { cursor++; description = quoted(words[cursor++]); }
      if (words[cursor++] !== '@') fail('Every connection needs an @identifier.');
      const id = identifier(words[cursor++]); unique(id);
      const edge: ParsedTopology['edges'][number] = { id, sourceId, targetId, isAsync, description };
      const seen = new Set<string>();
      if (words[cursor] === '[') {
        cursor++;
        while (cursor < words.length && words[cursor] !== ']') {
          const key = words[cursor++];
          if (seen.has(key)) fail(`Duplicate option: ${key}`);
          seen.add(key);
          if (key === 'roundtrip') edge.roundtrip = true;
          else {
            if (!['step', 'duration', 'repeat', 'protocol'].includes(key)) fail(`Unknown option: ${key}`);
            if (words[cursor++] !== '=') fail('Expected = after option.');
            const value = words[cursor++];
            if (key === 'protocol') edge.protocol = quoted(value);
            else if (key === 'duration') {
              const match = /^(\d+(?:\.\d+)?)(ms|s)$/.exec(value ?? '');
              if (!match) fail('Duration needs a unit, for example 800ms or 1.2s.');
              const duration = Number(match![1]) * (match![2] === 's' ? 1000 : 1);
              if (!Number.isFinite(duration) || duration <= 0) fail('Duration must be positive and finite.');
              edge.duration = duration;
            } else {
              const valueNumber = Number(value);
              if (!/^\d+$/.test(value ?? '') || !Number.isSafeInteger(valueNumber) || valueNumber < 1 || (key === 'repeat' && valueNumber > 10)) fail(key === 'repeat' ? 'Repeat particle count must be 1–10.' : 'Step must be a positive integer.');
              if (key === 'step') edge.step = valueNumber; else edge.repeat = valueNumber;
            }
          }
          if (words[cursor] === ']') break;
          if (words[cursor++] !== ',') fail('Separate options with commas.');
          if (words[cursor] === ']') fail('Expected an option after comma.');
        }
        if (words[cursor++] !== ']') fail('Missing closing ].');
      }
      if (cursor !== words.length) fail('Unexpected connection content.');
      if (edge.roundtrip && (edge.repeat || edge.isAsync)) fail('Roundtrip cannot be combined with repeat or async.');
      edges.push(edge); declarations.push({kind: 'edge', id, line: index, tokens}); return;
    }
    const group = words[0] === 'group';
    if (!group && !types.has(words[0])) fail(`Unknown component type: ${words[0]}`);
    if (words.length !== (group ? 4 : 3) || (group && words[3] !== '{')) fail('Expected: type identifier "Label" (groups end with {).');
    const id = identifier(words[1]); unique(id);
    const parentId = groups[groups.length - 1];
    nodes.push({ id, type: group ? 'section' : words[0], name: quoted(words[2]), ...(parentId ? {parentId} : {}) });
    declarations.push({ kind: 'node', id, line: index, tokens, parent: parentId });
    if (group) groups.push(id);
  });
  if (!header) throw new DslError(1, 'Start with yada 1.');
  if (groups.length) throw new DslError(lines.length, 'Missing closing group brace.');
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  for (const edge of edges) {
    if (!nodeMap.has(edge.sourceId) || !nodeMap.has(edge.targetId) || nodeMap.get(edge.sourceId)?.type === 'section' || nodeMap.get(edge.targetId)?.type === 'section') {
      throw new DslError(declarations.find(d => d.id === edge.id)!.line + 1, 'Connections must reference declared components, not groups.');
    }
  }
  if (edges.some(e => e.step !== undefined)) {
    const invalid = edges.find(e => e.step === undefined && (e.repeat || e.roundtrip || e.duration !== undefined));
    if (invalid) throw new DslError(declarations.find(d => d.id === invalid.id)!.line + 1, 'Add step to a connection with playback options.');
  }
  return { nodes, edges, declarations, lines };
}

export function unsupportedTopology(logical: LogicalDiagram, visual: VisualDiagram): string | undefined {
  if (logical.sequenceDiagram) return 'Sequence-diagram metadata is not supported by the topology editor yet.';
  const used = new Set<string>();
  for (const step of logical.sequences) {
    if (used.has(step.edgeId)) return 'Multiple steps on one connection are not supported by the topology editor yet.';
    used.add(step.edgeId);
    const edge = logical.edges.find(e => e.id === step.edgeId);
    if (!edge || edge.isAsync !== step.isAsync) return 'Independent connection/step async settings are not supported yet.';
    const timing = visual.timelines[step.id];
    if (step.isRoundTrip && (edge.isAsync || timing?.animationMode === 'repeat')) return 'This legacy playback combination cannot be edited in topology code.';
    if (timing?.animationMode !== undefined && (timing.animationMode === 'roundTrip') !== !!step.isRoundTrip) return 'This legacy playback combination cannot be edited in topology code.';
    if (timing && (!Number.isFinite(timing.duration) || timing.duration <= 0)) return 'This legacy duration cannot be represented in topology code.';
    if (timing?.animationMode === 'repeat' && timing.repeatParticleCount !== undefined && (!Number.isInteger(timing.repeatParticleCount) || timing.repeatParticleCount < 1 || timing.repeatParticleCount > 10)) return 'This legacy particle count cannot be represented in topology code.';
    if (!Number.isSafeInteger(step.stepNumber) || step.stepNumber < 1) return 'This step order cannot be represented in topology code.';
  }
  if (logical.edges.length && !logical.sequences.length) return 'This diagram has connections without playback steps. Code editing would create steps automatically.';
  const nodes = new Map(logical.nodes.map(n => [n.id, n]));
  for (const node of logical.nodes) {
    if (node.type !== 'section' && !types.has(node.type)) return `Unsupported component type: ${node.type}`;
    const ancestors = new Set([node.id]);
    let parent = node.parentId;
    while (parent) {
      if (ancestors.has(parent) || nodes.get(parent)?.type !== 'section') return 'Invalid or cyclic group membership.';
      ancestors.add(parent); parent = nodes.get(parent)?.parentId;
    }
  }
  if (logical.edges.some(e => !nodes.has(e.sourceId) || !nodes.has(e.targetId) || nodes.get(e.sourceId)?.type === 'section' || nodes.get(e.targetId)?.type === 'section')) return 'Group connections or missing endpoints are not supported yet.';
}
function aliases(logical: LogicalDiagram): Pick<DslDocument, 'nodeIds' | 'edgeIds'> {
  const nodeIds: Record<string, string> = {}, edgeIds: Record<string, string> = {}, used = new Set<string>();
  const liveIds = new Set([...logical.nodes, ...logical.edges].map(item => item.id));
  const reserved = new Set([...Object.entries(logical.dsl?.nodeIds ?? {}), ...Object.entries(logical.dsl?.edgeIds ?? {})].filter(([, id]) => liveIds.has(id)).map(([alias]) => alias));
  const add = (id: string, name: string, old: Record<string, string> | undefined, result: Record<string, string>) => {
    let alias = Object.keys(old ?? {}).find(key => old![key] === id);
    if (!alias || used.has(alias)) {
      let base = name.replace(/[^A-Za-z0-9_]+/g, '_').replace(/^[^A-Za-z_]+/, '') || 'item';
      if (['__proto__', 'constructor', 'prototype'].includes(base)) base = `item_${base}`;
      alias = base; let index = 2;
      while (used.has(alias) || reserved.has(alias)) alias = `${base}_${index++}`;
    }
    used.add(alias); result[alias] = id;
  };
  logical.nodes.forEach(n => add(n.id, n.name, logical.dsl?.nodeIds, nodeIds));
  logical.edges.forEach(e => add(e.id, e.description || 'connection', logical.dsl?.edgeIds, edgeIds));
  return {nodeIds, edgeIds};
}
export function generateTopology(logical: LogicalDiagram, visual: VisualDiagram): DslDocument {
  const maps = aliases(logical);
  const nodeAlias = new Map(Object.entries(maps.nodeIds).map(([a, id]) => [id, a]));
  const edgeAlias = new Map(Object.entries(maps.edgeIds).map(([a, id]) => [id, a]));
  const lines = ['yada 1', ''];
  const emit = (parent?: string, depth = 0) => {
    for (const node of logical.nodes.filter(n => n.parentId === parent || (!parent && !n.parentId))) {
      lines.push(`${'  '.repeat(depth)}${node.type === 'section' ? 'group' : node.type} ${nodeAlias.get(node.id)} ${JSON.stringify(node.name)}${node.type === 'section' ? ' {' : ''}`);
      if (node.type === 'section') { emit(node.id, depth + 1); lines.push(`${'  '.repeat(depth)}}`); }
    }
  };
  // Invalid legacy hierarchies are shown read-only without recursive traversal.
  if (unsupportedTopology(logical, visual) === 'Invalid or cyclic group membership.') {
    logical.nodes.forEach(n => lines.push(`${n.type === 'section' ? 'service' : n.type} ${nodeAlias.get(n.id)} ${JSON.stringify(n.name)}`));
  } else emit();
  lines.push('');
  for (const edge of logical.edges) {
    const step = logical.sequences.find(s => s.edgeId === edge.id), options: string[] = [];
    if (step) {
      options.push(`step=${step.stepNumber}`);
      const timing = visual.timelines[step.id];
      if (step.isRoundTrip) options.push('roundtrip');
      if (timing?.animationMode === 'repeat') options.push(`repeat=${timing.repeatParticleCount ?? 1}`);
      options.push(`duration=${timing?.duration ?? 1000}ms`);
    }
    if (edge.protocol) options.push(`protocol=${JSON.stringify(edge.protocol)}`);
    lines.push(`${nodeAlias.get(edge.sourceId) ?? 'missing'} ${edge.isAsync ? '~>' : '-->'} ${nodeAlias.get(edge.targetId) ?? 'missing'} : ${JSON.stringify(edge.description ?? '')} @${edgeAlias.get(edge.id)}${options.length ? ` [${options.join(', ')}]` : ''}`);
  }
  return {version: 1, source: lines.join('\n') + '\n', ...maps};
}

/** Preserve exact lines for unchanged declarations and token spacing for simple edits. */
export function syncTopology(logical: LogicalDiagram, visual: VisualDiagram, previousLogical?: LogicalDiagram, previousVisual?: VisualDiagram): DslDocument {
  const generated = generateTopology(logical, visual), old = logical.dsl;
  if (!old) return generated;
  if (unsupportedTopology(logical, visual)) return old;
  try {
    const before = parseTopology(old.source), after = parseTopology(generated.source);
    const byId = new Map(before.declarations.map(d => [d.id, d]));
    const previousProjection = previousLogical && previousVisual ? parseTopology(generateTopology(previousLogical, previousVisual).source) : undefined;
    const semantic = (p: ParsedTopology, d: Declaration) => d.kind === 'node' ? p.nodes.find(n => n.id === d.id) : p.edges.find(e => e.id === d.id);
    const lines = [...before.lines];
    const sameStructure = before.declarations.length === after.declarations.length && after.declarations.every(d => {
      const previous = byId.get(d.id); return previous?.kind === d.kind && previous.parent === d.parent && (d.kind !== 'node' || (before.nodes.find(n => n.id === d.id)?.type === 'section') === (after.nodes.find(n => n.id === d.id)?.type === 'section'));
    });
    const updatedLine = (d: Declaration) => {
      const previous = byId.get(d.id);
      if (!previous) return after.lines[d.line];
      const original = before.lines[previous.line];
      const previousCanonical = previousProjection?.declarations.find(item => item.id === d.id);
      if (previousCanonical && JSON.stringify(semantic(previousProjection!, previousCanonical)) === JSON.stringify(semantic(after, d))) return original;
      if (JSON.stringify(semantic(before, previous)) === JSON.stringify(semantic(after, d))) return original;
      if (previous.tokens.length === d.tokens.length) {
        let result = original;
        for (let i = previous.tokens.length - 1; i >= 0; i--) {
          if (previous.tokens[i].text !== d.tokens[i].text) result = result.slice(0, previous.tokens[i].start) + d.tokens[i].text + result.slice(previous.tokens[i].end);
        }
        return result;
      }
      return original.slice(0, previous.tokens[0].start) + after.lines[d.line].trimStart() + original.slice(previous.tokens[previous.tokens.length - 1].end);
    };
    if (sameStructure) {
      after.declarations.forEach(d => { lines[byId.get(d.id)!.line] = updatedLine(d); });
      generated.source = lines.join('\n');
    } else {
      // Carry attached comments with their declaration; preserve orphan comments too.
      const claimed = new Set<number>(), comments = new Map<string, string[]>();
      before.declarations.forEach(d => {
        const attached: string[] = [];
        for (let i = d.line - 1; i >= 0 && before.lines[i].trim().startsWith('%%'); i--) { attached.unshift(before.lines[i]); claimed.add(i); }
        comments.set(d.id, attached);
      });
      const declarations = new Map(after.declarations.map(d => [d.line, d]));
      const result = after.lines.flatMap((line, index) => {
        const d = declarations.get(index); if (!d) return [line];
        const indent = line.match(/^\s*/)![0];
        return [...(comments.get(d.id) ?? []).map(c => indent + c.trimStart()), indent + updatedLine(d).trimStart()];
      });
      const surviving = new Set(after.declarations.map(d => d.id));
      const orphans = before.lines.filter((line, i) => line.trim().startsWith('%%') && !claimed.has(i));
      comments.forEach((value, id) => { if (!surviving.has(id)) orphans.push(...value); });
      generated.source = [...orphans, ...result].join('\n');
    }
    // Keep a separate unfinished draft, never overwrite it with canvas changes.
    if (old.draft !== undefined) { generated.draft = old.draft; generated.draftBase = old.draftBase; }
    return generated;
  } catch { return {...generated, ...(old.draft !== undefined ? {draft: old.draft} : {})}; }
}

export function compileTopology(source: string, logical: LogicalDiagram, visual: VisualDiagram, metadata = logical.dsl ?? generateTopology(logical, visual)) {
  const parsed = parseTopology(source);
  const nodeIds: Record<string, string> = {}, edgeIds: Record<string, string> = {};
  const fresh = (kind: string) => `dsl_${kind}_${crypto.randomUUID()}`;
  parsed.nodes.forEach(n => { nodeIds[n.id] = (Object.prototype.hasOwnProperty.call(metadata.nodeIds, n.id) ? metadata.nodeIds[n.id] : undefined) ?? fresh('node'); });
  parsed.edges.forEach(e => { edgeIds[e.id] = (Object.prototype.hasOwnProperty.call(metadata.edgeIds, e.id) ? metadata.edgeIds[e.id] : undefined) ?? fresh('edge'); });
  const nodes = parsed.nodes.map(n => ({...logical.nodes.find(old => old.id === nodeIds[n.id]), ...n, id: nodeIds[n.id], parentId: n.parentId ? nodeIds[n.parentId] : undefined}));
  const edges: LogicalEdge[] = parsed.edges.map(e => ({...logical.edges.find(old => old.id === edgeIds[e.id]), id: edgeIds[e.id], sourceId: nodeIds[e.sourceId], targetId: nodeIds[e.targetId], isAsync: e.isAsync, description: e.description, protocol: e.protocol}));
  const explicit = parsed.edges.some(e => e.step !== undefined);
  const sequences: SequenceStep[] = [];
  const timelines: VisualDiagram['timelines'] = {...visual.timelines};
  parsed.edges.forEach((edge, index) => {
    if (explicit && edge.step === undefined) return;
    const previous = logical.sequences.find(s => s.edgeId === edgeIds[edge.id]);
    const id = previous?.id ?? fresh('step');
    sequences.push({...previous, id, edgeId: edgeIds[edge.id], stepNumber: edge.step ?? index + 1, isAsync: edge.isAsync, isRoundTrip: !!edge.roundtrip});
    timelines[id] = {...visual.timelines[id], sequenceId: id, duration: edge.duration ?? visual.timelines[id]?.duration ?? 1000, delay: visual.timelines[id]?.delay ?? 0, animationMode: edge.repeat ? 'repeat' : edge.roundtrip ? 'roundTrip' : 'normal', ...(edge.repeat ? {repeatParticleCount: edge.repeat} : {})};
  });
  logical.sequences.forEach(step => { if (!sequences.some(nextStep => nextStep.id === step.id)) delete timelines[step.id]; });
  const next: LogicalDiagram = {...logical, nodes, edges, sequences, dsl: {version: 1, source, nodeIds, edgeIds}};
  const direction = visual.autoLayoutDirection ?? 'LR';
  const generated = generateLayout(next, visual, direction);
  const layoutNodes = {...visual.layoutNodes};
  // Remove only actual deleted components: annotation/freehand layout data survives.
  logical.nodes.forEach(n => { if (!nodes.some(nextNode => nextNode.id === n.id)) delete layoutNodes[n.id]; });
  const absolute = (id: string, nodeList: LogicalNode[], layouts: VisualDiagram['layoutNodes']): {x: number; y: number} => {
    const node = nodeList.find(n => n.id === id), position = layouts[id] ?? {x: 0, y: 0};
    const parent = node?.parentId ? absolute(node.parentId, nodeList, layouts) : {x: 0, y: 0};
    return {x: parent.x + position.x, y: parent.y + position.y};
  };
  nodes.forEach(n => {
    if (layoutNodes[n.id]) return;
    const siblings = nodes.filter(other => other.parentId === n.parentId);
    const index = siblings.findIndex(other => other.id === n.id);
    const existingRight = Math.max(0, ...logical.nodes.filter(other => other.parentId === n.parentId).map(other => (visual.layoutNodes[other.id]?.x ?? 0) + (visual.layoutNodes[other.id]?.width ?? 224)));
    const initial = generated.layoutNodes[n.id] ?? {id: n.id, x: 0, y: 0, width: 304, height: 132, zIndex: -1};
    layoutNodes[n.id] = {...initial,
      x: n.parentId ? 40 + (direction === 'LR' ? index * 260 : 0) : logical.nodes.length ? existingRight + 80 + index * 260 : initial.x,
      y: n.parentId ? 70 + (direction === 'TB' ? index * 120 : 0) : logical.nodes.length ? 100 : initial.y,
    };
  });
  // React Flow stores child coordinates relative to their parent. Reparenting
  // retains the old absolute position, rather than interpreting it as local.
  nodes.forEach(n => {
    const previous = logical.nodes.find(old => old.id === n.id);
    if (!previous || previous.parentId === n.parentId) return;
    const oldPosition = absolute(n.id, logical.nodes, visual.layoutNodes);
    const parent = n.parentId ? absolute(n.parentId, nodes, layoutNodes) : {x: 0, y: 0};
    layoutNodes[n.id] = {...layoutNodes[n.id], x: oldPosition.x - parent.x, y: oldPosition.y - parent.y};
  });
  const affectedGroups = new Set<string>();
  nodes.forEach(n => {
    const old = logical.nodes.find(previous => previous.id === n.id);
    if (old && old.parentId === n.parentId) return;
    let parent = n.parentId;
    while (parent) { affectedGroups.add(parent); parent = nodes.find(item => item.id === parent)?.parentId; }
  });
  // Expand affected groups inside out. Compensate children's local coordinates
  // if the origin shifts, so their absolute canvas positions stay unchanged.
  [...nodes].reverse().filter(n => n.type === 'section' && affectedGroups.has(n.id)).forEach(n => {
    const children = nodes.filter(child => child.parentId === n.id).map(child => layoutNodes[child.id]);
    if (!children.length) return;
    const old = layoutNodes[n.id];
    const dx = Math.min(0, ...children.map(c => c.x - 40));
    const dy = Math.min(0, ...children.map(c => c.y - 50));
    layoutNodes[n.id] = {...old, x: old.x + dx, y: old.y + dy, width: Math.max(old.width ?? 0, ...children.map(c => c.x + (c.width ?? 224) + 40)) - dx, height: Math.max(old.height ?? 0, ...children.map(c => c.y + (c.height ?? 52) + 40)) - dy};
    if (dx || dy) children.forEach(child => { layoutNodes[child.id] = {...child, x: child.x - dx, y: child.y - dy}; });
  });
  const layoutEdges = Object.fromEntries(edges.map(e => [e.id, visual.layoutEdges[e.id] ?? generated.layoutEdges[e.id]]));
  const deleted = logical.nodes.filter(n => !nodes.some(nextNode => nextNode.id === n.id)).length + logical.edges.filter(e => !edges.some(nextEdge => nextEdge.id === e.id)).length + logical.sequences.filter(s => !sequences.some(nextStep => nextStep.id === s.id)).length;
  const structure = (document: LogicalDiagram) => JSON.stringify({
    nodes: document.nodes.map(n => [n.id, n.type, n.parentId ?? null]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    edges: document.edges.map(e => [e.id, e.sourceId, e.targetId]).sort((a, b) => a[0].localeCompare(b[0])),
  });
  const topologyChanged = structure(next) !== structure(logical);
  const hydrated = {...visual, layoutNodes, layoutEdges, timelines};
  return {logicalData: next, visualData: topologyChanged ? layoutDiagram(next, hydrated, direction) : hydrated, deleted, topologyChanged};
}
