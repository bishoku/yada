/**
 * particles.ts
 *
 * Single source of truth for all particle types used in edge animations.
 * Each particle has:
 *  - id: the stored string value
 *  - label: short display name
 *  - description: tooltip / longer description
 *  - renderSvg: function returning SVG elements for the animation canvas
 *  - previewSvg: JSX for the picker thumbnail (viewBox 0 0 32 32)
 */

export type ParticleType =
  | 'dot'       // generic data packet
  | 'arrow'     // directional flow
  | 'envelope'  // event / async message
  | 'rest'      // REST / HTTP call
  | 'grpc'      // gRPC (bidirectional streaming)
  | 'ws'        // WebSocket / real-time
  | 'graphql'   // GraphQL query
  | 'kafka'     // Kafka / event stream
  | 'pkg'       // message queue packet
  | 'sql';      // SQL / database query

export interface ParticleDef {
  id: ParticleType;
  label: string;
  color: string;        // primary fill for animation particle
  glowColor: string;    // rgba string used for filter shadow
}

export const PARTICLE_DEFS: ParticleDef[] = [
  { id: 'dot',      label: 'Data',      color: '#4f46e5', glowColor: 'rgba(99,102,241,0.9)' },
  { id: 'arrow',    label: 'Arrow',     color: '#4f46e5', glowColor: 'rgba(99,102,241,0.9)' },
  { id: 'envelope', label: 'Event',     color: '#7c3aed', glowColor: 'rgba(124,58,237,0.9)' },
  { id: 'rest',     label: 'REST',      color: '#0891b2', glowColor: 'rgba(8,145,178,0.9)'  },
  { id: 'grpc',     label: 'gRPC',      color: '#1d4ed8', glowColor: 'rgba(29,78,216,0.9)'  },
  { id: 'ws',       label: 'WS',        color: '#059669', glowColor: 'rgba(5,150,105,0.9)'  },
  { id: 'graphql',  label: 'GraphQL',   color: '#e10098', glowColor: 'rgba(225,0,152,0.9)'  },
  { id: 'kafka',    label: 'Kafka',     color: '#b45309', glowColor: 'rgba(180,83,9,0.9)'   },
  { id: 'pkg',      label: 'Queue',     color: '#be185d', glowColor: 'rgba(190,24,93,0.9)'  },
  { id: 'sql',      label: 'SQL',       color: '#15803d', glowColor: 'rgba(21,128,61,0.9)'  },
];

export const PARTICLE_MAP = Object.fromEntries(
  PARTICLE_DEFS.map((d) => [d.id, d])
) as Record<ParticleType, ParticleDef>;

/** Default particle used when none is set */
export const DEFAULT_PARTICLE: ParticleType = 'dot';

/** Resolve any legacy value (circle → dot) */
export function resolveParticleType(raw: string | undefined): ParticleType {
  if (!raw) return DEFAULT_PARTICLE;
  if (raw === 'circle') return 'dot'; // legacy alias
  if (raw in PARTICLE_MAP) return raw as ParticleType;
  return DEFAULT_PARTICLE;
}
