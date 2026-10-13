import test from 'node:test';
import assert from 'node:assert/strict';
import headless from '@xterm/headless';
import { findFooter } from '../src/screen.mjs';

const { Terminal } = headless;
const line = '  GPT-6.1-Sol · high · 5h 85% left · weekly 82% left · Context 49% left';
const write = (terminal, data) => new Promise((resolve) => terminal.write(data, resolve));

test('finds the inline footer near row 13 instead of assuming screen bottom', async () => {
  const terminal = new Terminal({ cols: 100, rows: 24, allowProposedApi: true });
  try {
    await write(terminal, '\x1b[13;1H' + line + '\x1b[11;3H');
    assert.equal(findFooter(terminal.buffer.active, 24)?.row, 12);
  } finally { terminal.dispose(); }
});
test('ignores matching transcript text above the input cursor', async () => {
  const terminal = new Terminal({ cols: 100, rows: 24, allowProposedApi: true });
  try {
    await write(terminal, '\x1b[5;1H' + line + '\x1b[11;3H');
    assert.equal(findFooter(terminal.buffer.active, 24), null);
  } finally { terminal.dispose(); }
});
test('tracks partial ANSI updates, resize and the current composer position', async () => {
  const terminal = new Terminal({ cols: 100, rows: 24, allowProposedApi: true });
  try {
    await write(terminal, '\x1b[23;1H' + line + '\x1b[21;3H');
    await write(terminal, '\x1b[23;24H5h 84% left\x1b[21;3H');
    assert.match(findFooter(terminal.buffer.active, 24).line, /5h 84% left/);
    terminal.resize(120, 30);
    await write(terminal, '\x1b[2J\x1b[29;1H' + line + '\x1b[27;3H');
    assert.equal(findFooter(terminal.buffer.active, 30).row, 28);
  } finally { terminal.dispose(); }
});
