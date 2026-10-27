import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
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
  const reader = (path, input, headers = {}) => fetch(`${origin}/api/reader/${path}`, { method: 'POST',
    headers: { origin, 'content-type': 'application/json', ...headers }, body: JSON.stringify(input) });
  await check('HTTP13 연결번호발급회원인증401', async () => assert.equal((await reader('member', { operation: 'pair', payload: { blog_id: 'fixture', owner_confirmed: true } })).status, 401));
  await check('HTTP14 확장토큰없음401', async () => assert.equal((await reader('extension', { operation: 'whoami', payload: {} }, { origin: `chrome-extension://${'a'.repeat(32)}` })).status, 401));
  await check('HTTP15 연결번호형식오류400', async () => assert.equal((await reader('extension', { operation: 'connect', payload: { code: 'invalid' } }, { origin: `chrome-extension://${'a'.repeat(32)}` })).status, 400));
  await check('HTTP16 확장API웹출처거절403', async () => assert.equal((await reader('extension', { operation: 'whoami', payload: {} })).status, 403));
  await check('HTTP17 정리API비밀값없이401', async () => assert.equal((await fetch(`${origin}/api/cron/cleanup-reader`)).status, 401));
  await check('HTTP18 공개확장버전확인', async () => {
    const r = await fetch(`${origin}/api/extension/version`); assert.equal(r.status, 200); assert.equal((await r.json()).version, 'v1.01');
  });
  await check('HTTP19 ZIP다운로드바이트일치', async () => {
    const r = await fetch(`${origin}/downloads/blog-neighbor-care-extension-latest.zip`); assert.equal(r.status, 200);
    assert.deepEqual(Buffer.from(await r.arrayBuffer()), readFileSync(new URL('../public/downloads/blog-neighbor-care-extension-latest.zip', import.meta.url)));
  });
  await check('HTTP20 연결화면미로그인안내', async () => {
    const r = await fetch(`${origin}/reader`); assert.equal(r.status, 200); assert.match(await r.text(), /로그인이 필요합니다/);
  });
  await check('HTTP21 회원연결API다른출처403', async () => assert.equal((await reader('member', { operation: 'materials', payload: {} }, { origin: 'https://other.test' })).status, 403));
  await check('HTTP22 확장GET405', async () => assert.equal((await fetch(`${origin}/api/reader/extension`)).status, 405));
  await check('HTTP23 루트에서연결화면으로이동', async () => {
    const r = await fetch(origin, { redirect: 'manual' }); assert.equal(r.status, 307); assert.equal(r.headers.get('location'), '/reader');
  });
  await check('HTTP24 프로필/후보분석회원인증401·캐시금지', async () => {
    const r=await fetch(`${origin}/api/analysis`,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({operation:'list',payload:{}})});
    assert.equal(r.status,401);assert.match(r.headers.get('cache-control'),/no-store/);assert.match((await r.json()).error,/로그인/);
  });
  await check('HTTP25 분석GET실행차단405', async () => assert.equal((await fetch(`${origin}/api/analysis`)).status,405));
  await check('HTTP26 새프로필화면회원가드·메뉴·모델번들', async () => {
    const r=await fetch(`${origin}/studio`);assert.equal(r.status,200);const html=await r.text();assert.match(html,/AIMaster 로그인/);assert.match(html,/후보 비교/);assert.doesNotMatch(html,/api[_-]?key["']\s*:\s*["'][^"']{20}/i);
  });
  await check('HTTP27 후보화면회원가드', async () => {const html=await (await fetch(`${origin}/candidates`)).text();assert.match(html,/AIMaster 로그인/);});
  await check('HTTP28 매뉴얼의동의·후보범위·재실행금지', async () => {const html=await (await fetch(`${origin}/guide`)).text();assert.match(html,/자동 재실행하지 않습니다/);assert.match(html,/3~5개/);assert.match(html,/모델을 선택/);});
  await check('HTTP29 설정화면회원가드', async () => {const html=await (await fetch(`${origin}/settings`)).text();assert.match(html,/AIMaster 로그인/);});
  await check('HTTP30 후보검색미로그인401·캐시금지', async () => {const r=await fetch(`${origin}/api/candidates/search`,{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'});assert.equal(r.status,401);assert.match(r.headers.get('cache-control'),/no-store/);});
  await check('HTTP31 후보검색GET405',async()=>assert.equal((await fetch(`${origin}/api/candidates/search`)).status,405));
} finally {
  const closed = new Promise(resolve => child.once('exit', resolve));
  child.kill(); await Promise.race([closed, new Promise(resolve => setTimeout(resolve, 3000))]);
  mkdirSync(new URL('../docs/evidence/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../docs/evidence/search-http-20261027.json', import.meta.url), JSON.stringify({
    checkedAt: new Date().toISOString(), command: 'npm run test:http', tests, passed: tests.length,
    expected: 31, server: 'Next production server on loopback', realCredentialsUsed: false,
    operatingSessionVerified: false, operatingDatabaseChanged: false,
    serverStopped: child.exitCode !== null || child.signalCode !== null,
  }, null, 2)+'\n');
  if (child.exitCode === null && child.signalCode === null) throw new Error('Own local server did not exit');
}
assert.equal(tests.length, 31);
console.log('로컬 HTTP31개 통과·서버 종료, 실제키/로그인세션 사용0.');
