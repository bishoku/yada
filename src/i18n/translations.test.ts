import { describe, expect, it } from 'vitest';
import { translations } from './translations';

function flatten(value: object, prefix = ''): Record<string, string> {
  return Object.fromEntries(Object.entries(value).flatMap(([key, entry]) => typeof entry === 'object'
    ? Object.entries(flatten(entry, `${prefix}${key}.`)) : [[`${prefix}${key}`, entry]]));
}

describe('translation catalog contract', () => {
  const tr = flatten(translations.tr), en = flatten(translations.en);
  it('has the same nonempty messages in both languages', () => {
    expect(Object.keys(tr).sort()).toEqual(Object.keys(en).sort());
    for (const value of [...Object.values(tr), ...Object.values(en)]) expect(value.trim()).not.toBe('');
  });
  it('preserves interpolation parameters across languages', () => {
    for (const key of Object.keys(en)) {
      const parameters = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
      expect(parameters(tr[key]), key).toEqual(parameters(en[key]));
    }
  });
});
