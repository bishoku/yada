import { describe, it, expect } from 'vitest';
import { completions, setEdgeOption, nextStep } from './completion';
const header = 'yada 1\nservice api "API"\ndatabase db "Database"\ngroup box "Box" {\n}\n';
const suggest = (line: string) => completions(header + line, (header + line).length).items.map(i => i.label);
describe('contextual code assistance', () => {
  it('suggests declared nodes including in incomplete connections, excluding groups', () => {
    expect(suggest('api --> ')).toEqual(['api', 'db']);
    expect(suggest('api --> d')).toEqual(['db']);
    expect(suggest('ap')).toEqual(['api']);
  });
  it('never suggests inside labels, comments or declarations', () => {
    expect(suggest('%% api')).toEqual([]);
    expect(suggest('api --> db : "dur')).toEqual([]);
    expect(suggest('service new')).toEqual([]);
  });
  it('filters duplicate and incompatible options and suggests values', () => {
    expect(suggest('api --> db @call [du')).toEqual(['duration']);
    expect(suggest('api --> db @call [step=1, ')).not.toContain('step');
    expect(suggest('api ~> db @call [')).not.toContain('roundtrip');
    expect(suggest('api --> db @call [repeat=3, ')).not.toContain('roundtrip');
    expect(suggest('api --> db @call [duration=1')).toEqual(['1s', '1.2s']);
    expect(suggest('api --> db @call [repeat=')).toHaveLength(10);
  });
  it('replaces the complete word when the caret is in the middle', () => {
    const source = header + 'api --> database';
    const result = completions(source, source.length - 6);
    expect(source.slice(result.from, result.to)).toBe('database');
  });
  it('updates only the selected edge and preserves comments and quoted commas', () => {
    const source = header + 'api --> db @call [step=2, protocol="a,b"] %% keep\ndb --> api @reply';
    const updated = setEdgeOption(source, header.length + 5, 'duration', '800ms')!;
    expect(updated.text).toBe(source.replace('protocol="a,b"]', 'protocol="a,b", duration=800ms]'));
  });
  it('switches mutually exclusive modes and inserts missing brackets before comments', () => {
    const source = header + 'api --> db @call %% keep';
    const repeat = setEdgeOption(source, header.length, 'repeat', '3')!;
    expect(repeat.text).toContain('@call [repeat=3] %% keep');
    const roundtrip = setEdgeOption(repeat.text, header.length, 'roundtrip', '')!;
    expect(roundtrip.text).toContain('[roundtrip] %% keep');
    expect(roundtrip.text).not.toContain('repeat=');
    expect(setEdgeOption(roundtrip.text, header.length, 'mode')!.text).not.toContain('roundtrip');
  });
  it('computes the next step beyond comments and ignores quoted fake options', () => {
    expect(nextStep(header + '%% step=100\napi --> db : "step=99" @call [step=4]')).toBe(5);
  });
});
it('completes an existing option name without duplicating its value', () => {
  const source = header + 'api --> db @call [duration=500ms]';
  const position = source.indexOf('duration=') + 2;
  const result = completions(source, position);
  expect(source.slice(0, result.from) + result.items[0].insert + source.slice(result.to)).toBe(source);
});
it('does not modify an unfinished quoted value through quick controls', () => {
  const source = header + 'api --> db @call [protocol="unfinished';
  expect(setEdgeOption(source, source.length, 'step', '1')).toBeUndefined();
});
