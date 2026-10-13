import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { readWindows } from './format.mjs';

export function createRatesClient(binaryPath, env, onSnapshot = () => {}) {
  const server = spawn(binaryPath, ['app-server'], { env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  server.stderr.resume();
  const lines = createInterface({ input: server.stdout });
  const pending = new Map();
  let nextId = 1;
  let interval;
  let stopped = false;
  let refreshing = false;
  const send = (message) => server.stdin.write(JSON.stringify(message) + '\n');
  function request(method, params = {}) {
    if (stopped) return Promise.reject(new Error('statusbar account reader closed'));
    return new Promise((resolve, reject) => {
      const id = nextId++;
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error('statusbar account reader timeout'));
      }, 15_000);
      pending.set(id, { resolve, reject, timeout });
      try { send({ id, method, params }); }
      catch { clearTimeout(timeout); pending.delete(id); reject(new Error('statusbar account reader write failed')); }
    });
  }
  function settleAll() {
    for (const job of pending.values()) {
      clearTimeout(job.timeout);
      job.reject(new Error('statusbar account reader stopped'));
    }
    pending.clear();
  }
  const close = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(interval);
    settleAll();
    lines.close();
    server.stdin.destroy();
    server.kill();
  };
  server.on('error', close);
  server.on('exit', close);
  server.stdin.on('error', close);
  lines.on('line', (line) => {
    let message;
    try { message = JSON.parse(line); } catch { return; }
    if (message.method === 'account/rateLimits/updated') onSnapshot(readWindows(message.params));
    const job = pending.get(message.id);
    if (!job) return;
    clearTimeout(job.timeout);
    pending.delete(message.id);
    if (message.error) job.reject(new Error('statusbar rate limits unavailable'));
    else job.resolve(message.result);
  });
  async function refresh() {
    if (refreshing || stopped) return null;
    refreshing = true;
    try {
      const snapshot = readWindows(await request('account/rateLimits/read'));
      onSnapshot(snapshot);
      return snapshot;
    } catch { onSnapshot(null); return null; }
    finally { refreshing = false; }
  }
  const ready = (async () => {
    await request('initialize', { clientInfo: { name: 'aimaster_codex_statusbar', title: 'Codex reset countdown statusbar', version: '1.0.1' } });
    send({ method: 'initialized', params: {} });
    const snapshot = await refresh();
    interval = setInterval(() => { void refresh(); }, 60_000);
    return snapshot;
  })().catch(() => { close(); return null; });
  return { ready, refresh, close };
}
