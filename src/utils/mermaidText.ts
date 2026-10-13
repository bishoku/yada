/** Mermaid decimal entities prevent labels from becoming syntax or HTML. */
export function encodeMermaidText(text: string): string {
  return text.replace(/[&#;<>"\r\n]/g, character => character === '\n' ? '<br/>' : character === '\r' ? '' : `#${character.codePointAt(0)};`);
}
export function decodeMermaidText(text: string): string {
  return text.replace(/<br\s*\/?\s*>/gi, '\n').replace(/&?#(\d+);|&?(?:#|&)(quot|amp|lt|gt);/g, (raw, decimal, named) => {
    if (decimal) {
      const code = Number(decimal);
      return code <= 0x10ffff ? String.fromCodePoint(code) : raw;
    }
    return ({ quot: '"', amp: '&', lt: '<', gt: '>' } as Record<string, string>)[named] ?? raw;
  });
}
