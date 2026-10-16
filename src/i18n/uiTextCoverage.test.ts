import ts from 'typescript';
import { expect, it } from 'vitest';

// Protocols, brands, keyboard keys and units intentionally stay unchanged.
const allowed = new Set(['Esc', 'x', 'ms /', 'ms', 'ms)', '0ms', 'S', 'X (', 'Y (', 'px', 'YADA', '?embed=true', 'Cloudflare KV', '600px', 'GIF', 'Video (MP4)', 'HTTP, gRPC, WS...', 'OpenAI', 'Google Gemini', 'Anthropic (Claude)']);
const componentSources = import.meta.glob<string>('../components/**/*.tsx', { query: '?raw', import: 'default', eager: true });

it('keeps user-visible JSX text and text attributes in the translation catalogs', () => {
  const violations: string[] = [];
  for (const [file, content] of Object.entries(componentSources)) {
    if (file.includes('.test.')) continue;
    const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node) => {
      let text: string | undefined;
      if (ts.isJsxText(node)) text = node.text.trim();
      if (ts.isJsxAttribute(node) && ['title', 'placeholder', 'alt', 'aria-label', 'label'].includes(node.name.getText(source)) && node.initializer && ts.isStringLiteral(node.initializer)) text = node.initializer.text;
      if (text && /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(text) && !allowed.has(text)) violations.push(`${file}:${source.getLineAndCharacterOfPosition(node.pos).line + 1} ${text}`);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  expect(violations).toEqual([]);
});
