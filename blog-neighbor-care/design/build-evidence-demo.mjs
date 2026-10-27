import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const program = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.resolve(program, '../scratch/blog-neighbor-care-evidence-20261027');
fs.mkdirSync(target, { recursive: true });
const result = await build({ entryPoints: [path.join(program, 'design/evidence-demo.tsx')], bundle: true, write: false,
  platform: 'browser', format: 'iife', target: 'es2022', jsx: 'automatic', minify: true, define: { 'process.env.NODE_ENV': '"production"' } });
const script = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = fs.readFileSync(path.join(program, 'src/app/globals.css'), 'utf8');
fs.writeFileSync(path.join(target, 'index.html'), `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'"><title>활동·관계 근거 표시 — 합성 자료</title><style>${css}</style></head><body><div id="root"></div><script>${script}</script></body></html>`);
console.log(JSON.stringify({ target, bytes: result.outputFiles[0].contents.length, externalConnections: false }));
