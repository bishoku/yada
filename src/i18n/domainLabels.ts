import type { FilterOperator } from '../adapters/types';
import type { ParticleType } from '../config/particles';

export const operatorLabels: Record<'en' | 'tr', Record<FilterOperator, string>> = {
  en: { '=': 'is', '!=': 'is not', '>': '>', '<': '<', '>=': '≥', '<=': '≤', contains: 'contains', not_contains: 'does not contain', in: 'in list', not_in: 'not in list' },
  tr: { '=': 'eşittir', '!=': 'eşit değildir', '>': '>', '<': '<', '>=': '≥', '<=': '≤', contains: 'içerir', not_contains: 'içermez', in: 'listede', not_in: 'listede değil' },
};
export const particleLabels: Record<'en' | 'tr', Record<ParticleType, string>> = {
  en: { dot: 'Data', arrow: 'Arrow', envelope: 'Event', rest: 'REST', grpc: 'gRPC', ws: 'WebSocket', graphql: 'GraphQL', kafka: 'Kafka', pkg: 'Queue', sql: 'SQL' },
  tr: { dot: 'Veri', arrow: 'Ok', envelope: 'Olay', rest: 'REST', grpc: 'gRPC', ws: 'WebSocket', graphql: 'GraphQL', kafka: 'Kafka', pkg: 'Kuyruk', sql: 'SQL' },
};
export const colorLabels: Record<'en' | 'tr', Record<string, string>> = {
  en: { white: 'White', slate: 'Slate', indigo: 'Indigo', emerald: 'Emerald', amber: 'Amber', rose: 'Rose', violet: 'Violet', cyan: 'Cyan' },
  tr: { white: 'Beyaz', slate: 'Arduvaz', indigo: 'Çivit', emerald: 'Zümrüt', amber: 'Kehribar', rose: 'Gül', violet: 'Mor', cyan: 'Camgöbeği' },
};
