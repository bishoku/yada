/** Shared vocabulary for validation and the tolerant, display-only lexer. */
export const topologyNodeTypes = new Set('client service server database cache queue gateway worker cdn firewall load_balancer auth storage search event_bus external_api llm ai_agent freeform'.split(' '));
export type SyntaxKind = 'type' | 'keyword' | 'identifier' | 'edgeId' | 'arrow' | 'option' | 'value' | 'string' | 'comment' | 'punctuation' | 'invalid' | 'plain';
export type SyntaxToken = {text: string; kind: SyntaxKind};
const options = new Set(['step', 'duration', 'roundtrip', 'repeat', 'protocol']);

/** Lossless highlighting even while a statement is incomplete. Never parses HTML. */
export function highlightTopology(source: string): SyntaxToken[][] {
  return source.split('\n').map(line => {
    const result: SyntaxToken[] = [];
    const tokens = line.match(/%%.*$|"(?:\\.|[^"\\])*"?|-->|~>|@[A-Za-z_][A-Za-z0-9_]*|[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?(?:ms|s)?|\s+|./g) ?? [];
    let first = true, inOptions = false;
    for (const text of tokens) {
      let kind: SyntaxKind = 'plain';
      if (/^\s+$/.test(text)) { result.push({text, kind}); continue; }
      if (text.startsWith('%%')) kind = 'comment';
      else if (text.startsWith('"')) kind = /^"(?:\\.|[^"\\])*"$/.test(text) ? 'string' : 'invalid';
      else if (text === '-->' || text === '~>') kind = 'arrow';
      else if (text.startsWith('@')) kind = 'edgeId';
      else if (first && topologyNodeTypes.has(text)) kind = 'type';
      else if (first && ['yada', 'group'].includes(text)) kind = 'keyword';
      else if (inOptions && options.has(text)) kind = 'option';
      else if (/^\d/.test(text)) kind = 'value';
      else if (/^[A-Za-z_]/.test(text)) kind = 'identifier';
      else if ('{}[],:='.includes(text)) kind = 'punctuation';
      else kind = 'invalid';
      if (text === '[') inOptions = true;
      if (text === ']') inOptions = false;
      result.push({text, kind}); first = false;
    }
    return result;
  });
}
