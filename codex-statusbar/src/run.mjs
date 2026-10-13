import pty from 'node-pty';
import headless from '@xterm/headless';
import fs from 'node:fs';
import { StringDecoder } from 'node:string_decoder';
import { createRatesClient } from './rates.mjs';
import { formatFooter } from './format.mjs';
import { findFooter } from './screen.mjs';

const { Terminal } = headless;

export async function runStatusbar({ binaryPath, args, env, tracePath }) {
  const getSize = () => ({ cols: Math.max(20, process.stdout.columns || 80), rows: Math.max(10, process.stdout.rows || 24) });
  const size = getSize();
  const mirror = new Terminal({ ...size, allowProposedApi: true, scrollback: 0 });
  const child = pty.spawn(binaryPath, args, { ...size, env, cwd: process.cwd(), name: 'xterm-256color', useConpty: true });
  let snapshot = null;
  let stopped = false;
  let lastTrace = '';
  let overlayRow = -1;
  let lastRenderKey = '';
  const originalRaw = process.stdin.isRaw;
  const decoder = new StringDecoder('utf8');
  const repaint = (force = false) => {
    if (stopped) return;
    try {
      const footer = findFooter(mirror.buffer.active, size.rows);
      if (footer) {
        const { row, line } = footer;
        const formatted = formatFooter(line, snapshot, size.cols);
        if (!formatted && overlayRow !== row) return;
        const display = formatted || line;
        const renderKey = `${row}:${size.cols}:${display}`;
        if (!force && renderKey === lastRenderKey) return;
        // DEC save/restore preserves the input cursor and its original attributes.
        process.stdout.write(`\x1b7\x1b[${row + 1};1H\x1b[2K\x1b[0;38;5;179m${display}\x1b8`);
        overlayRow = formatted ? row : -1;
        lastRenderKey = renderKey;
        if (tracePath && formatted !== lastTrace) {
          fs.appendFileSync(tracePath, JSON.stringify({ at: new Date().toISOString(), row, cols: size.cols, footer: formatted }) + '\n');
          lastTrace = formatted;
        }
        return;
      }
    } catch { /* A display overlay failure must not stop the user's Codex. */ }
  };
  const client = createRatesClient(binaryPath, env, (value) => { snapshot = value; repaint(); });
  child.onData((data) => {
    process.stdout.write(data);
    const printable = data.replace(/\x1b\][\s\S]*?(?:\x07|\x1b\\)/g, '').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\x00-\x1f]/g, '').trim();
    const redraw = Boolean(printable) || /\x1b\[[012]?[JK]/.test(data);
    mirror.write(data, () => repaint(redraw));
  });
  const input = (data) => { const text = decoder.write(data); if (text) child.write(text); };
  const resize = () => {
    const next = getSize();
    Object.assign(size, next);
    child.resize(next.cols, next.rows);
    mirror.resize(next.cols, next.rows);
    repaint();
  };
  const signal = () => { try { child.kill(); } catch {} };
  process.stdin.setRawMode?.(true);
  process.stdin.resume();
  process.stdin.on('data', input);
  process.stdout.on('resize', resize);
  process.on('SIGTERM', signal);
  process.on('SIGHUP', signal);
  const clock = setInterval(repaint, 1000);
  const code = await new Promise((resolve) => child.onExit(({ exitCode }) => resolve(exitCode)));
  stopped = true;
  clearInterval(clock);
  client.close();
  process.stdin.removeListener('data', input);
  process.stdout.removeListener('resize', resize);
  process.removeListener('SIGTERM', signal);
  process.removeListener('SIGHUP', signal);
  process.stdin.setRawMode?.(Boolean(originalRaw));
  process.stdin.pause();
  mirror.dispose();
  return code;
}
