export type Completion = {label: string; detail: string; insert: string};
export type CompletionResult = {from: number; to: number; items: Completion[]};
const identifier = '[A-Za-z_][A-Za-z0-9_]*';

/** Mask quoted text and comments without changing offsets, including incomplete strings. */
function masked(line: string) {
  let quoted = false, escaped = false, result = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (!quoted && line.slice(i, i + 2) === '%%') return result + ' '.repeat(line.length - i);
    if (quoted) {
      result += ' ';
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') { quoted = true; result += ' '; }
    else result += c;
  }
  return result;
}
export function lineAt(source: string, cursor: number) {
  const start = source.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1;
  const end = source.indexOf('\n', cursor);
  return {start, end: end < 0 ? source.length : end, text: source.slice(start, end < 0 ? source.length : end)};
}
export function nextStep(source: string) {
  const values = [...source.split('\n').map(masked).join('\n').matchAll(/\bstep\s*=\s*(\d+)/g)].map(match => Number(match[1]));
  return Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, ...values.filter(Number.isSafeInteger)) + 1);
}
export function completions(source: string, cursor: number): CompletionResult {
  const line = lineAt(source, cursor), offset = cursor - line.start;
  const before = line.text.slice(0, offset), clean = masked(before);
  const prefix = /[A-Za-z0-9_.]*$/.exec(before)![0];
  const from = cursor - prefix.length;
  const suffix = /^[A-Za-z0-9_.]*/.exec(line.text.slice(offset))![0];
  const result: CompletionResult = {from, to: cursor + suffix.length, items: []};
  // An offset inside a string/comment is masked, including whitespace after %%.
  if (masked(before + '\u0001').slice(-1) !== '\u0001') return result;
  const options = clean.lastIndexOf('[') > clean.lastIndexOf(']');
  let items: Completion[] = [];
  if (options) {
    const part = clean.slice(clean.lastIndexOf('[') + 1);
    const current = part.slice(part.lastIndexOf(',') + 1);
    const value = /^\s*(step|duration|repeat)\s*=\s*[\w.]*$/.exec(current);
    if (value) {
      const values = value[1] === 'duration' ? ['250ms', '500ms', '800ms', '1s', '1.2s', '2s', '5s'] : value[1] === 'repeat' ? Array.from({length: 10}, (_, i) => String(i + 1)) : [...new Set(['1', '2', '3', String(nextStep(source))])];
      items = values.map(v => ({label: v, detail: value[1], insert: v}));
    } else if (/^\s*\w*$/.test(current)) {
      const whole = masked(line.text);
      const existing = whole.slice(whole.indexOf('[') + 1).split(',').filter((_, index) => index !== part.split(',').length - 1);
      const keys = new Set(existing.map(s => /^\s*(\w+)/.exec(s)?.[1]));
      items = [
        {label: 'step', detail: 'step', insert: `step=${nextStep(source)}`},
        {label: 'duration', detail: 'duration', insert: 'duration=1s'},
        {label: 'roundtrip', detail: 'roundtrip', insert: 'roundtrip'},
        {label: 'repeat', detail: 'repeat', insert: 'repeat=3'},
        {label: 'protocol', detail: 'protocol', insert: 'protocol="HTTPS"'},
      ].filter(item => !keys.has(item.label) && !(item.label === 'roundtrip' && (keys.has('repeat') || clean.includes('~>'))) && !(item.label === 'repeat' && keys.has('roundtrip')));
    }
  } else if (new RegExp(`^\\s*(?:${identifier}\\s*(?:-->|~>)\\s*)?[A-Za-z0-9_]*$`).test(before) || /^\s*$/.test(before)) {
    for (const nodeLine of source.split('\n')) {
      const match = new RegExp(`^\\s*(\\w+)\\s+(${identifier})\\s+("(?:\\\\.|[^"\\\\])*")`).exec(nodeLine);
      if (match && !['group', 'yada'].includes(match[1])) {
        try { items.push({label: match[2], detail: JSON.parse(match[3]), insert: match[2]}); } catch { /* incomplete declaration */ }
      }
    }
  }
  if (options && /^\s*=/.test(source.slice(result.to))) items = items.map(item => ({...item, insert: item.label}));
  result.items = items.filter((item, index, all) => item.label.toLowerCase().startsWith(prefix.toLowerCase()) && all.findIndex(other => other.label === item.label) === index);
  return result;
}

export function edgeAt(source: string, cursor: number) {
  const line = lineAt(source, cursor), clean = masked(line.text);
  const quotedTokens: string[] = line.text.match(/"(?:\\.|[^"\\])*"|%%.*$|"/g) ?? [];
  if (quotedTokens.includes('"')) return undefined;
  if (!new RegExp(`^\\s*${identifier}\\s*(-->|~>)\\s*${identifier}\\b`).test(clean) || !new RegExp(`@${identifier}\\b`).test(clean)) return undefined;
  const bracket = clean.indexOf('['), close = clean.indexOf(']', bracket);
  const body = bracket >= 0 ? clean.slice(bracket + 1, close < 0 ? undefined : close) : '';
  return {...line, async: clean.includes('~>'), bracket, close,
    step: /\bstep\s*=\s*(\d+)/.exec(body)?.[1] ?? '',
    duration: /\bduration\s*=\s*([\d.]+(?:ms|s))/.exec(body)?.[1] ?? '',
    repeat: /\brepeat\s*=\s*(\d+)/.exec(body)?.[1] ?? '',
    roundtrip: /\broundtrip\b/.test(body),
  };
}

/** Change one edge option; keep quoted protocol values, trailing comments and other lines. */
export function setEdgeOption(source: string, cursor: number, key: string, value?: string) {
  const edge = edgeAt(source, cursor);
  if (!edge) return undefined;
  const clean = masked(edge.text);
  const start = edge.bracket;
  const end = edge.close < 0 ? clean.trimEnd().length : edge.close;
  const body = start < 0 ? '' : edge.text.slice(start + 1, end);
  const mask = masked(body);
  const parts: string[] = [];
  let previous = 0;
  for (let i = 0; i <= body.length; i++) {
    if (i === body.length || mask[i] === ',') { const part = body.slice(previous, i).trim(); if (part) parts.push(part); previous = i + 1; }
  }
  const remove = new Set([key]);
  if (key === 'roundtrip') remove.add('repeat');
  if (key === 'repeat') remove.add('roundtrip');
  if (key === 'mode') { remove.add('roundtrip'); remove.add('repeat'); }
  const kept = parts.filter(part => !remove.has(/^\w+/.exec(part)?.[0] ?? ''));
  if (value !== undefined && key !== 'mode') kept.push(key === 'roundtrip' ? 'roundtrip' : `${key}=${value}`);
  const replacement = kept.length ? `[${kept.join(', ')}]` : '';
  const insertion = start < 0 ? clean.trimEnd().length : start;
  const after = start < 0 ? insertion : edge.close < 0 ? end : end + 1;
  const updated = edge.text.slice(0, insertion) + (start < 0 && replacement ? ' ' : '') + replacement + edge.text.slice(after);
  return {text: source.slice(0, edge.start) + updated + source.slice(edge.end), cursor: edge.start + insertion + (start < 0 && replacement ? 1 : 0) + replacement.length};
}
