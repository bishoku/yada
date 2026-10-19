import { describe, expect, it } from 'vitest';
import { highlightTopology } from './syntax';
import { DslError, parseTopology } from './topology';
describe('topology syntax highlighting', () => {
  it('separates types, identifiers, arrows, edge IDs, options and values', () => {
    const tokens = highlightTopology('service api "API"\napi --> db @query [step=1, duration=800ms, roundtrip]');
    expect(tokens[0]).toContainEqual({text: 'service', kind: 'type'});
    expect(tokens[0]).toContainEqual({text: 'api', kind: 'identifier'});
    expect(tokens[1]).toEqual(expect.arrayContaining([
      {text: '-->', kind: 'arrow'}, {text: '@query', kind: 'edgeId'},
      {text: 'step', kind: 'option'}, {text: 'duration', kind: 'option'},
      {text: '800ms', kind: 'value'}, {text: 'roundtrip', kind: 'option'},
    ]));
  });
  it.each(['', '\n', 'yada 1\n\n', 'service api "Incomplete', '\tapi ~> db @x [duration=1.2s] %% comment', 'service step "<img src=x> \\"quoted\\" %%"'])('keeps every source character including incomplete input: %s', source => {
    expect(highlightTopology(source).map(line => line.map(token => token.text).join('')).join('\n')).toBe(source);
  });
  it('does not tokenize keywords inside strings or comments or confuse an identifier with an option', () => {
    const tokens = highlightTopology('service step "duration=1s -->" %% repeat=3')[0];
    expect(tokens).toContainEqual({text: 'step', kind: 'identifier'});
    expect(tokens).toContainEqual({text: '"duration=1s -->"', kind: 'string'});
    expect(tokens).toContainEqual({text: '%% repeat=3', kind: 'comment'});
    expect(tokens.some(token => token.kind === 'option')).toBe(false);
  });
  it('marks unfinished strings while remaining safe for literal markup', () => {
    expect(highlightTopology('service a "<script>')[0].slice(-1)[0]).toEqual({text: '"<script>', kind: 'invalid'});
  });
  it('uses the parser line for syntax errors and clears diagnostics after a correction', () => {
    const source = 'yada 1\nservice a "A"\na --> a @call [duration=0ms]';
    try { parseTopology(source); throw new Error('Expected validation failure'); }
    catch (error) { expect(error).toBeInstanceOf(DslError); expect((error as DslError).line).toBe(3); }
    expect(() => parseTopology(source.replace('0ms', '500ms'))).not.toThrow();
  });
});
