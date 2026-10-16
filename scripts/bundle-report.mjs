// Static import graph accounting. Compressed sizes are summed per file, not a network trace.
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import { init, parse } from 'es-module-lexer';
await init;
const root = resolve(process.argv[2] || 'dist');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const entry = html.match(/<script[^>]+src="([^"]+)"/)?.[1];
if (!entry) throw new Error('No application entry found');
const files = new Map();
async function walk(path) {
  if (files.has(path)) return;
  const source = await readFile(path, 'utf8');
  files.set(path, { file: relative(root, path), bytes: (await stat(path)).size, gzipBytes: gzipSync(source).length });
  for (const item of parse(source)[0]) {
    if (item.d === -1 && item.n?.startsWith('.') && item.n.endsWith('.js')) await walk(resolve(dirname(path), item.n));
  }
}
const entryPath = resolve(root, entry.replace(/^\//, ''));
await walk(entryPath);
const initial = [...files.values()];
const sum = values => ({ files: values.length, bytes: values.reduce((n, f) => n + f.bytes, 0), gzipBytes: values.reduce((n, f) => n + f.gzipBytes, 0) });
// WelcomeScreen is the default standalone route. Account for its lazy import too.
const sources = await Promise.all([...files.keys()].map(p => readFile(p, 'utf8')));
const welcome = sources.flatMap(s => parse(s)[0]).find(i => i.d !== -1 && i.n?.includes('/WelcomeScreen-'))?.n;
if (welcome) await walk(resolve(dirname(entryPath), welcome));
console.log(JSON.stringify({ initial: sum(initial), welcome: sum([...files.values()]), initialFiles: initial.sort((a,b) => b.bytes-a.bytes), welcomeAdditionalFiles: [...files.values()].filter(f => !initial.includes(f)) }, null, 2));
