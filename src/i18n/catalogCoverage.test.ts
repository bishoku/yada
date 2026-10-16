import { editingCopy } from './editingCopy';
import { reliabilityCopy } from './reliabilityCopy';
import { experienceCopy } from './experienceCopy';
import { describe, expect, it } from 'vitest';
import { messages, message } from './messages';
import { uiCopy } from './uiCopy';
import { playerCopy } from './playerCopy';
import { operatorLabels, particleLabels, colorLabels } from './domainLabels';
import { workspaceCopy } from './workspaceCopy';
import { copyDomains } from './copyDomains';

const catalogs = { editingCopy, reliabilityCopy, experienceCopy, workspaceCopy, messages, uiCopy, playerCopy, operatorLabels, particleLabels, colorLabels };
for (const [name, catalog] of Object.entries(catalogs)) {
  describe(`${name} language contract`, () => {
    it('has matching nonempty messages and parameters', () => {
      const en: Record<string, string> = catalog.en, tr: Record<string, string> = catalog.tr;
      expect(Object.keys(tr).sort()).toEqual(Object.keys(en).sort());
      for (const key of Object.keys(en)) {
        expect(en[key].trim(), key).not.toBe(''); expect(tr[key].trim(), key).not.toBe('');
        const parameters = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
        expect(parameters(tr[key]), key).toEqual(parameters(en[key]));
      }
    });
  });
}

it('inserts diagram names literally in either language', () => {
  const value = 'İstek $& {source}';
  expect(message('tr', 'ConnectionConfirmModal.executionOrder', { source: value, target: 'API' })).toContain(value);
  expect(message('en', 'ConnectionConfirmModal.executionOrder', { source: value, target: 'API' })).toContain(value);
  for (const language of ['tr', 'en'] as const) expect(copyDomains.dashboard[language].confirmDelete(value)).toContain(value);
});
