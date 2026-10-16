import { afterEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NodePropertiesForm } from './NodePropertiesForm';
import { EdgePropertiesForm } from './EdgePropertiesForm';
import { useAppStore } from '../../../store/useAppStore';
import { message } from '../../../i18n/messages';

const originalLanguage = useAppStore.getInitialState().language;
afterEach(() => { useAppStore.getInitialState().language = originalLanguage; });

for (const language of ['tr', 'en'] as const) {
  it(`associates component and connection field labels in ${language}`, () => {
    useAppStore.getInitialState().language = language;
    const node = renderToStaticMarkup(<NodePropertiesForm activeNode={{ id: 'node', name: 'User name', type: 'server', theme: 'white' }} language={language} connectedHandleIds={new Set()} onSubmit={vi.fn()} onPreview={vi.fn()} />);
    const edge = renderToStaticMarkup(<EdgePropertiesForm activeEdge={{ id: 'edge', protocol: 'HTTP', isAsync: false, stepNumber: 1, duration: 1000, delay: 0, tooltipText: '', tooltipDuration: 0 }} language={language} maxSteps={30} sequenceRoundTrip={false} onSubmit={vi.fn()} onPreview={vi.fn()} />);
    const nameLabel = node.match(new RegExp(`<label[^>]*for="([^"]+)"[^>]*>${message(language, 'NodePropertiesForm.name')}</label>`));
    expect(nameLabel).not.toBeNull();
    expect(node).toContain(`id="${nameLabel![1]}"`);
    expect(node).toContain('User name');
    expect(edge).toMatch(/<label[^>]*for="[^"]+"/);
  });
}
