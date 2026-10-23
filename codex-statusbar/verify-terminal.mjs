import path from 'node:path';
import fs from 'node:fs';
import { runStatusbar } from './src/run.mjs';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(root, '.local'), { recursive: true });
const binaryPath = path.join(process.env.APPDATA, 'npm/node_modules/@openai/codex/node_modules/@openai/codex-win32-x64/vendor/x86_64-pc-windows-msvc/bin/codex.exe');
process.exit(await runStatusbar({ binaryPath, args: ['-C', path.dirname(root), '--no-alt-screen'], env: process.env, tracePath: path.join(root, '.local/terminal-check.jsonl') }));
