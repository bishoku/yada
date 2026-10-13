/** Optional semantic metadata. Schema v2 files without it retain legacy behavior. */
export type MermaidArrow = '->>' | '-->>' | '->' | '-->' | '-x' | '--x' | '-)' | '--)' | '<<->>' | '<<-->>';
export type MermaidFragmentKind = 'alt' | 'opt' | 'loop' | 'par' | 'critical' | 'break' | 'rect';
export type MermaidEvent =
  | { type: 'message'; sequenceId: string }
  | { type: 'activation'; participantId: string; active: boolean }
  | { type: 'note'; annotationId: string; participantIds: string[]; position: 'left of' | 'right of' | 'over' }
  | { type: 'fragment'; sectionId: string; kind: MermaidFragmentKind; label: string; branches: { label?: string; divider?: 'else' | 'and' | 'option'; events: MermaidEvent[] }[] };
export interface MermaidSequenceMetadata {
  version: 1;
  title?: string;
  autonumber?: { start?: number; increment?: number };
  events: MermaidEvent[];
}
