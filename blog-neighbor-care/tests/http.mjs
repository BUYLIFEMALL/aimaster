import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const reservation = createServer();
await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
// 실제 키/세션을 읽지 않는다. 세션없는401 경로만 검사, 운영연결 검수로 보고하지 않는다.
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, NODE_ENV: 'production',
    NEXT_PUBLIC_SUPABASE_URL: 'https://esgxyikcnnvmlhygjkth.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture-not-a-real-key' },
});
let output = ''; child.stdout.on('data', x => { output += x; }); child.stderr.on('data', x => { output += x; });
const origin = `http://127.0.0.1:${port}`, tests = [];
const request = (input = { operation: 'settings' }, headers = {}) => fetch(`${origin}/api/work`, {
  method: 'POST', headers: { origin, 'content-type': 'application/json', ...headers }, body: JSON.stringify(input),
});
async function check(name, fn) { await fn(); tests.push(name); console.log(`ok ${tests.length} - ${name}`); }
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(`${origin}/api/work`)).status === 405) { ready = true; break; } } catch { /* startup */ }
    if (child.exitCode !== null) throw new Error('Local Next server exited');
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  if (!ready) throw new Error('Local Next server not ready');
  await check('HTTP01 미로그인실제Next응답401', async () => {
    const r = await request(); assert.equal(r.status, 401, await r.clone().text()); assert.match((await r.json()).error, /로그인/);
  });
  await check('HTTP02 회원응답캐시금지', async () => assert.match((await request()).headers.get('cache-control'), /no-store/));
  await check('HTTP03 다른출처403', async () => assert.equal((await request(undefined, { origin: 'https://other.test' })).status, 403));
  await check('HTTP04 JSON아닌요청415', async () => assert.equal((await request(undefined, { 'content-type': 'text/plain' })).status, 415));
  await check('HTTP05 Origin없는요청403', async () => {
    const r = await fetch(`${origin}/api/work`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); assert.equal(r.status, 403);
  });
  await check('HTTP06 GET실행차단405', async () => assert.equal((await fetch(`${origin}/api/work`)).status, 405));
  const materialUrl = `${origin}/api/material/preview`;
  const preview = (headers = {}) => fetch(materialUrl, { method: 'POST',
    headers: { origin, 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ operation: 'summary_preview', payload: { profile: { own_blog_id: 'fixture', keywords: ['가상'] }, items: [] } }),
  });
  await check('HTTP07 자료미리보기실제Next응답401', async () => {
    const r = await preview(); assert.equal(r.status, 401, await r.clone().text()); assert.match((await r.json()).error, /로그인/);
  });
  await check('HTTP08 자료미리보기캐시금지', async () => assert.match((await preview()).headers.get('cache-control'), /no-store/));
  await check('HTTP09 자료미리보기다른출처403', async () => assert.equal((await preview({ origin: 'https://other.test' })).status, 403));
  await check('HTTP10 자료미리보기JSON아닌요청415', async () => assert.equal((await preview({ 'content-type': 'text/plain' })).status, 415));
  await check('HTTP11 자료미리보기Origin누락403', async () => {
    const r = await fetch(materialUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); assert.equal(r.status, 403);
  });
  await check('HTTP12 자료미리보기GET405', async () => assert.equal((await fetch(materialUrl)).status, 405));
} finally {
  const closed = new Promise(resolve => child.once('exit', resolve));
  child.kill(); await Promise.race([closed, new Promise(resolve => setTimeout(resolve, 3000))]);
  mkdirSync(new URL('../docs/evidence/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../docs/evidence/http-20261027.json', import.meta.url), JSON.stringify({
    checkedAt: new Date().toISOString(), command: 'npm run test:http', tests, passed: tests.length,
    expected: 12, server: 'Next production server on loopback', realCredentialsUsed: false,
    operatingSessionVerified: false, operatingDatabaseChanged: false,
    serverStopped: child.exitCode !== null || child.signalCode !== null,
  }, null, 2)+'\n');
  if (child.exitCode === null && child.signalCode === null) throw new Error('Own local server did not exit');
}
assert.equal(tests.length, 12);
console.log('로컬 HTTP12개 통과·서버 종료, 실제키/로그인세션 사용0.');
