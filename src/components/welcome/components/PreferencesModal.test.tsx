import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PreferencesModal } from './PreferencesModal';

for (const language of ['tr', 'en'] as const) it(`keeps both preference tab targets present in ${language}`, () => {
  const markup = renderToStaticMarkup(<PreferencesModal isOpen onClose={() => {}} language={language} theme="nord" onChangeLanguage={() => {}} onChangeTheme={() => {}} />);
  const targets = [...markup.matchAll(/role="tab"[^>]*aria-controls="([^"]+)"/g)].map(match => match[1]);
  expect(targets).toHaveLength(2);
  for (const target of targets) expect(markup).toContain(`id="${target}"`);
  expect(markup.match(/role="tabpanel"/g)).toHaveLength(2);
  expect(markup).toContain('aria-selected="false" tabindex="-1"');
});
