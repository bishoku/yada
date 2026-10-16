import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Field, Input, Select } from './Field';
import { Button } from './Button';

it('connects the field name, guidance and error while preserving existing descriptions', () => {
  const html=renderToStaticMarkup(<Field label="Çalışma alanı" hint="Açıklama" error="Alan gerekli"><Input id="workspace-name" aria-describedby="existing" required /></Field>);
  expect(html).toContain('for="workspace-name"');
  expect(html).toContain('aria-describedby="existing workspace-name-hint workspace-name-error"');
  expect(html).toContain('aria-invalid="true"');
  expect(html).toContain('id="workspace-name-error"');
  expect(html).toContain('role="alert"');
});
it('keeps native select semantics and the action name while busy', () => {
  const html=renderToStaticMarkup(<><Field label="Theme"><Select defaultValue="dark"><option value="dark">Dark</option></Select></Field><Button busy>Save changes</Button></>);
  expect(html).toContain('<select'); expect(html).toContain('<option value="dark" selected="">');
  expect(html).toContain('aria-busy="true"'); expect(html).toContain('disabled=""'); expect(html).toContain('Save changes');
});
