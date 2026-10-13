import type { LogicalDiagram, VisualDiagram } from '../types';
import type { MermaidArrow, MermaidEvent } from '../types/mermaid';
import { calculateSchedules } from '../store/scheduler';
import { computeParticipantOrder, computeSlots } from '../components/sequence/sequenceLayoutUtils';
import { encodeMermaidText } from './mermaidText';

const arrows = new Set<MermaidArrow>(['->>', '-->>', '->', '-->', '-x', '--x', '-)', '--)', '<<->>', '<<-->>']);
export type MermaidExportWarning = 'timingAndStyle' | 'missingReference' | 'unanchoredNotes' | 'sourceOrder';

/** Text interchange; .dproj remains the lossless editable format. Does not mutate input. */
export function generateMermaidSequence(logical: LogicalDiagram, visual: VisualDiagram): { text: string; warnings: MermaidExportWarning[] } {
  const warnings = new Set<MermaidExportWarning>(['timingAndStyle']);
  const participants = logical.nodes.filter(node => node.type !== 'section');
  const order = computeParticipantOrder(participants, logical.edges);
  participants.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  const aliases = new Map(participants.map((node, index) => [node.id, `P${index + 1}`]));
  const nodes = new Map(logical.nodes.map(node => [node.id, node]));
  const edges = new Map(logical.edges.map(edge => [edge.id, edge]));
  const steps = new Map(logical.sequences.map(step => [step.id, step]));
  const lines = ['sequenceDiagram'];
  const safe = (text: string) => encodeMermaidText(text).replace(/\bend\b/gi, word => `#${word.charCodeAt(0)};${word.slice(1)}`);
  const metadata = logical.sequenceDiagram?.version === 1 ? logical.sequenceDiagram : undefined;
  if (metadata?.title) lines.push(`    title ${safe(metadata.title)}`);
  if (metadata?.autonumber) {
    const { start, increment } = metadata.autonumber;
    lines.push(`    autonumber${start !== undefined ? ` ${start}${increment !== undefined ? ` ${increment}` : ''}` : ''}`);
  }
  const declared = new Set<string>();
  const declaration = (node: typeof participants[number], indent = '    ') => {
    declared.add(node.id);
    const actor = node.properties?.mermaidActor ?? node.type === 'client';
    lines.push(`${indent}${actor ? 'actor' : 'participant'} ${aliases.get(node.id)} as ${safe(node.name)}`);
  };
  for (const participant of participants) {
    if (declared.has(participant.id)) continue;
    const section = participant.parentId ? nodes.get(participant.parentId) : undefined;
    if (section?.type === 'section' && !section.properties?.fragmentType) {
      const rawColor = String(section.properties?.boxColor ?? 'transparent');
      const color = /^(transparent|[a-z]+|(?:rgb|rgba|hsl|hsla)\([\d\s.,%]+\))$/i.test(rawColor) ? rawColor : 'transparent';
      lines.push(`    box ${color} ${safe(section.name)}`);
      for (const member of participants.filter(node => node.parentId === section.id)) declaration(member, '        ');
      lines.push('    end');
    } else declaration(participant);
  }
  const emitted = new Set<string>();
  const emitMessage = (id: string, indent: string, isReturn = false) => {
    const step = steps.get(id), edge = step ? edges.get(step.edgeId) : undefined;
    if (!step || !edge || !aliases.has(edge.sourceId) || !aliases.has(edge.targetId)) { warnings.add('missingReference'); return; }
    const from = aliases.get(isReturn ? edge.targetId : edge.sourceId);
    const to = aliases.get(isReturn ? edge.sourceId : edge.targetId);
    const explicitArrow = edge.properties?.arrowType as MermaidArrow | undefined;
    const arrow = isReturn ? '-->>' : explicitArrow && arrows.has(explicitArrow) ? explicitArrow : step.isAsync ? '-)' : '->>';
    const label = isReturn ? '' : edge.description ?? edge.protocol ?? '';
    lines.push(`${indent}${from}${arrow}${to}: ${safe(label)}`);
    if (!isReturn) emitted.add(id);
  };
  const referenced: string[] = [];
  const emitEvents = (events: MermaidEvent[], indent = '    ') => {
    for (const event of events) {
      if (event.type === 'message') {
        referenced.push(event.sequenceId);
        emitMessage(event.sequenceId, indent);
        // An imported step can subsequently be edited into a round trip.
        if (steps.get(event.sequenceId)?.isRoundTrip) emitMessage(event.sequenceId, indent, true);
      } else if (event.type === 'activation') {
        const alias = aliases.get(event.participantId);
        if (alias) lines.push(`${indent}${event.active ? 'activate' : 'deactivate'} ${alias}`);
        else warnings.add('missingReference');
      } else if (event.type === 'note') {
        const note = visual.annotations?.[event.annotationId];
        const ids = event.participantIds.map(id => aliases.get(id));
        if (note && ids.length && ids.every(Boolean)) lines.push(`${indent}Note ${event.position} ${ids.join(',')}: ${safe(note.body)}`);
        else warnings.add('missingReference');
      } else if (event.type === 'fragment') {
        const section = nodes.get(event.sectionId);
        // Frame deletion removes the wrapper, not remaining interactions.
        if (!section) { for (const branch of event.branches) emitEvents(branch.events, indent); continue; }
        const label = event.kind === 'rect' ? event.label : section.name === event.kind ? '' : section.name;
        if (event.kind === 'rect' && !/^rgba?\([\d\s.,%]+\)$/i.test(label)) { warnings.add('missingReference'); for (const branch of event.branches) emitEvents(branch.events, indent); continue; }
        lines.push(`${indent}${event.kind}${label ? ` ${safe(label)}` : ''}`);
        event.branches.forEach((branch, index) => {
          if (index > 0 && branch.divider) lines.push(`${indent}${branch.divider}${branch.label ? ` ${safe(branch.label)}` : ''}`);
          emitEvents(branch.events, `${indent}    `);
        });
        lines.push(`${indent}end`);
      }
    }
  };
  if (metadata) {
    emitEvents(metadata.events);
    const referencedIds = new Set(referenced);
    const actual = [...logical.sequences].sort((a, b) => a.stepNumber - b.stepNumber).map(step => step.id).filter(id => referencedIds.has(id));
    if (actual.join('|') !== referenced.filter(id => steps.has(id)).join('|') || logical.sequences.some(step => !referencedIds.has(step.id))) warnings.add('sourceOrder');
    for (const step of [...logical.sequences].sort((a, b) => a.stepNumber - b.stepNumber)) {
      if (!emitted.has(step.id)) { emitMessage(step.id, '    '); if (step.isRoundTrip) emitMessage(step.id, '    ', true); }
    }
  } else {
    // Existing documents use the same time-ordered projection as the sequence view.
    const schedules = calculateSchedules(logical.sequences, visual.timelines, logical.edges, logical.nodes);
    const { fwdSlotMap, retSlotMap } = computeSlots(logical.sequences, schedules);
    const events = logical.sequences.flatMap(step => [
      { id: step.id, slot: fwdSlotMap.get(step.id)!, returned: false },
      ...(step.isRoundTrip ? [{ id: step.id, slot: retSlotMap.get(step.id)!, returned: true }] : []),
    ]).sort((a, b) => a.slot - b.slot);
    for (const event of events) emitMessage(event.id, '    ', event.returned);
    if (Object.keys(visual.annotations ?? {}).length) warnings.add('unanchoredNotes');
  }
  return { text: `${lines.join('\n')}\n`, warnings: [...warnings] };
}
