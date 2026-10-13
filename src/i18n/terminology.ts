/** UI vocabulary only. Persisted schema keys and user-authored labels are unchanged. */
export const terminology = {
  en: { diagram: 'Diagram', sequenceDiagram: 'Sequence diagram', timeline: 'Timeline', step: 'Step', connection: 'Connection', duration: 'Duration', delay: 'Delay', start: 'Start', end: 'End', process: 'Internal process', synchronous: 'Synchronous', asynchronous: 'Asynchronous', roundTrip: 'Round trip', stickyNote: 'Sticky note' },
  tr: { diagram: 'Diyagram', sequenceDiagram: 'Sıralama diyagramı', timeline: 'Zaman çizelgesi', step: 'Adım', connection: 'Bağlantı', duration: 'Süre', delay: 'Gecikme', start: 'Başlangıç', end: 'Bitiş', process: 'Bileşen içi işlem', synchronous: 'Senkron', asynchronous: 'Asenkron', roundTrip: 'Gidiş-dönüş', stickyNote: 'Yapışkan not' },
} as const;

const numberFormats = { en: new Intl.NumberFormat('en', { maximumFractionDigits: 2 }), tr: new Intl.NumberFormat('tr', { maximumFractionDigits: 2 }) };
export function formatMilliseconds(value: number, language: 'en' | 'tr'): string {
  return `${numberFormats[language].format(value)} ms`;
}
