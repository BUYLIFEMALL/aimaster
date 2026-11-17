// T-05(2026-11-17): 「한 페이지 분석」 robots.txt 판정 — 실제 robots-parser + 가짜 fetch·DNS로 외부 요청 0.
// 실제 TS 파일(safeFetch.ts·robots.ts)을 그대로 변환해 실행한다. 요청한 주소를 모두 기록해 "본문 요청 0"을 확인한다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const SRC = path.join(__dirname, '../src/lib/inspect');
function load(file, extra) {
  const js = ts.transpileModule(fs.readFileSync(path.join(SRC, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const m = { exports: {} };
  const req = (id) => {
    if (id in extra) return extra[id];
    return require(id);
  };
  new Function('module', 'exports', 'require', js)(m, m.exports, req);
  return m.exports;
}

// ── 가짜 DNS·연결 ─────────────────────────────────────────
// dnsDelay[host] = ms 만큼 늦게 답한다(QA023 P2 반례: DNS 대기 중 전체 제한 신호 무시).
let dnsDelay = {};
let dnsCalls = 0;
const dns = {
  lookup: async (host) => {
    dnsCalls++;
    if (dnsDelay[host]) await new Promise((r) => setTimeout(r, dnsDelay[host]));
    return host.startsWith('private') ? [{ address: '10.0.0.5', family: 4 }] : [{ address: '93.184.216.34', family: 4 }];
  },
};
class FakeAgent { constructor(o) { this.o = o; } close() { return Promise.resolve(); } }
const safeFetchMod = load('safeFetch.ts', { 'server-only': {}, 'node:dns/promises': dns, undici: { Agent: FakeAgent } });
const robotsMod = load('robots.ts', { 'server-only': {}, '@/lib/inspect/safeFetch': safeFetchMod });
const { safeFetch, BlockedUrlError } = safeFetchMod;
const { createRobotsGuard, RobotsBlockedError, RobotsUnavailableError, INSPECT_USER_AGENT, ROBOTS_MAX_BYTES } = robotsMod;

// ── 가짜 fetch: routes[href] = (opts) => Response | Promise<Response> ──
let log = [];
let routes = {};
globalThis.fetch = async (url, opts) => {
  const href = String(url);
  log.push({ href, ua: opts?.headers?.['User-Agent'] });
  const h = routes[href];
  if (!h) return new Response('not found', { status: 404 });
  return h(opts);
};
const txt = (body, status = 200) => () => new Response(body, { status });
const redirect = (to, status = 302) => () => new Response(null, { status, headers: { location: to } });
const PAGE = txt('<html><title>ok</title></html>');

async function run(url, r, init = {}) {
  log = [];
  routes = r;
  try {
    const { response, finalUrl } = await safeFetch(url, init, { beforeRequest: createRobotsGuard() });
    return { ok: true, status: response.status, finalUrl: finalUrl.href, log };
  } catch (error) {
    return { ok: false, error, log };
  }
}
const requested = (res, href) => res.log.some((l) => l.href === href);

test('전체 차단(Disallow: /) → 막힘, 본문 요청 0', async () => {
  const res = await run('https://a.test/page', { 'https://a.test/robots.txt': txt('User-agent: *\nDisallow: /'), 'https://a.test/page': PAGE });
  assert.ok(res.error instanceof RobotsBlockedError);
  assert.equal(requested(res, 'https://a.test/page'), false);
});

test('경로 차단: 막힌 경로만 막히고 다른 경로는 통과', async () => {
  const r = { 'https://a.test/robots.txt': txt('User-agent: *\nDisallow: /private'), 'https://a.test/private/x': PAGE, 'https://a.test/public': PAGE };
  assert.ok((await run('https://a.test/private/x', r)).error instanceof RobotsBlockedError);
  const ok = await run('https://a.test/public', r);
  assert.equal(ok.ok, true);
  assert.equal(ok.status, 200);
});

test('Allow가 더 구체적이면 허용', async () => {
  const res = await run('https://a.test/docs/open', { 'https://a.test/robots.txt': txt('User-agent: *\nDisallow: /docs\nAllow: /docs/open'), 'https://a.test/docs/open': PAGE });
  assert.equal(res.ok, true);
});

test('우리 UA 전용 그룹이 있으면 그 그룹만 적용(* 와 AND 하지 않음)', async () => {
  const body = 'User-agent: *\nDisallow: /\n\nUser-agent: WebCrawlerInspect\nAllow: /';
  const res = await run('https://a.test/page', { 'https://a.test/robots.txt': txt(body), 'https://a.test/page': PAGE });
  assert.equal(res.ok, true, '전용 그룹이 허용하면 * 의 차단을 따르지 않는다');
  const body2 = 'User-agent: *\nAllow: /\n\nUser-agent: WebCrawlerInspect\nDisallow: /x';
  const r2 = { 'https://a.test/robots.txt': txt(body2), 'https://a.test/x': PAGE, 'https://a.test/y': PAGE };
  assert.ok((await run('https://a.test/x', r2)).error instanceof RobotsBlockedError);
  assert.equal((await run('https://a.test/y', r2)).ok, true);
});

test('robots.txt 요청 UA = 본문 요청 UA', async () => {
  const res = await run('https://a.test/page', { 'https://a.test/robots.txt': txt('User-agent: *\nAllow: /'), 'https://a.test/page': PAGE }, { headers: { 'User-Agent': INSPECT_USER_AGENT } });
  assert.equal(res.ok, true);
  assert.ok(res.log.every((l) => l.ua === INSPECT_USER_AGENT));
});

for (const status of [404, 410]) {
  test(`robots ${status} → 규칙 없음으로 진행`, async () => {
    const res = await run('https://a.test/page', { 'https://a.test/robots.txt': txt('gone', status), 'https://a.test/page': PAGE });
    assert.equal(res.ok, true);
  });
}

test('빈 robots.txt → 진행', async () => {
  assert.equal((await run('https://a.test/page', { 'https://a.test/robots.txt': txt('  \n'), 'https://a.test/page': PAGE })).ok, true);
});

for (const status of [401, 403]) {
  test(`robots ${status} → 차단, 본문 0`, async () => {
    const res = await run('https://a.test/page', { 'https://a.test/robots.txt': txt('no', status), 'https://a.test/page': PAGE });
    assert.ok(res.error instanceof RobotsBlockedError);
    assert.equal(requested(res, 'https://a.test/page'), false);
  });
}

for (const status of [429, 500, 503, 418]) {
  test(`robots ${status} → 확인 불가(503), 본문 0, 재시도 0`, async () => {
    const res = await run('https://a.test/page', { 'https://a.test/robots.txt': txt('err', status), 'https://a.test/page': PAGE });
    assert.ok(res.error instanceof RobotsUnavailableError);
    assert.equal(requested(res, 'https://a.test/page'), false);
    assert.equal(res.log.filter((l) => l.href === 'https://a.test/robots.txt').length, 1, '자동 재시도 없음');
  });
}

test('연결 오류 → 확인 불가, 본문 0', async () => {
  const res = await run('https://a.test/page', { 'https://a.test/robots.txt': () => { throw new TypeError('fetch failed'); }, 'https://a.test/page': PAGE });
  assert.ok(res.error instanceof RobotsUnavailableError);
  assert.equal(requested(res, 'https://a.test/page'), false);
});

test('전체 제한 신호가 끝나면 robots 대기도 끝남(abort) → 확인 불가, 본문 0', async () => {
  const hang = (opts) => new Promise((_, rej) => opts.signal.addEventListener('abort', () => rej(opts.signal.reason)));
  const t0 = Date.now();
  const res = await run('https://a.test/page', { 'https://a.test/robots.txt': hang, 'https://a.test/page': PAGE }, { signal: AbortSignal.timeout(50) });
  assert.ok(res.error instanceof RobotsUnavailableError);
  assert.ok(Date.now() - t0 < 2000, '5초 robots 제한보다 먼저 전체 신호를 따른다');
  assert.equal(requested(res, 'https://a.test/page'), false);
});

test('512000바이트 초과 → 흐름 읽기 중단·확인 불가, 본문 0', async () => {
  let pulled = 0;
  const CHUNK = 64 * 1024;
  const big = () => new Response(new ReadableStream({
    pull(c) { pulled++; if (pulled > 40) { c.close(); return; } c.enqueue(new Uint8Array(CHUNK).fill(65)); },
  }), { status: 200 });
  const res = await run('https://a.test/page', { 'https://a.test/robots.txt': big, 'https://a.test/page': PAGE });
  assert.ok(res.error instanceof RobotsUnavailableError);
  assert.ok(pulled <= Math.ceil(ROBOTS_MAX_BYTES / CHUNK) + 2, `끝까지 읽지 않음(읽은 조각 ${pulled})`);
  assert.equal(requested(res, 'https://a.test/page'), false);
});

test('같은 출처 리디렉트 뒤 막힌 경로 → 그 주소 본문 0, robots는 1번만', async () => {
  const res = await run('https://a.test/start', {
    'https://a.test/robots.txt': txt('User-agent: *\nDisallow: /secret'),
    'https://a.test/start': redirect('/secret'),
    'https://a.test/secret': PAGE,
  });
  assert.ok(res.error instanceof RobotsBlockedError);
  assert.equal(requested(res, 'https://a.test/secret'), false);
  assert.equal(res.log.filter((l) => l.href === 'https://a.test/robots.txt').length, 1);
});

test('다른 출처로 리디렉트한 막힌 주소 → 그 출처 robots만 요청, 본문 0', async () => {
  const res = await run('https://a.test/go', {
    'https://a.test/robots.txt': txt('User-agent: *\nAllow: /'),
    'https://a.test/go': redirect('https://b.test/secret'),
    'https://b.test/robots.txt': txt('User-agent: *\nDisallow: /secret'),
    'https://b.test/secret': PAGE,
  });
  assert.ok(res.error instanceof RobotsBlockedError);
  assert.deepEqual(res.log.map((l) => l.href), ['https://a.test/robots.txt', 'https://a.test/go', 'https://b.test/robots.txt']);
});

test('다른 출처 리디렉트가 허용이면 정상 도착', async () => {
  const res = await run('https://a.test/go', {
    'https://a.test/robots.txt': txt('User-agent: *\nAllow: /'),
    'https://a.test/go': redirect('https://b.test/ok'),
    'https://b.test/robots.txt': txt('', 404),
    'https://b.test/ok': PAGE,
  });
  assert.equal(res.ok, true);
  assert.equal(res.finalUrl, 'https://b.test/ok');
});

test('robots.txt가 사설 주소로 리디렉트 → 차단(BlockedUrlError), 본문 0', async () => {
  const res = await run('https://a.test/page', { 'https://a.test/robots.txt': redirect('http://private.test/robots.txt'), 'https://a.test/page': PAGE });
  assert.ok(res.error instanceof BlockedUrlError);
  assert.equal(requested(res, 'http://private.test/robots.txt'), false);
  assert.equal(requested(res, 'https://a.test/page'), false);
});

test('robots.txt 리디렉트가 5회를 넘으면 차단, 본문 0', async () => {
  const r = { 'https://a.test/page': PAGE };
  for (let i = 0; i < 7; i++) r[i === 0 ? 'https://a.test/robots.txt' : `https://a.test/r${i}`] = redirect(`https://a.test/r${i + 1}`);
  const res = await run('https://a.test/page', r);
  assert.ok(res.error instanceof BlockedUrlError);
  assert.equal(requested(res, 'https://a.test/page'), false);
});

test('robots 요청에는 판정이 다시 걸리지 않음(재귀 0)', async () => {
  const res = await run('https://a.test/page', { 'https://a.test/robots.txt': txt('User-agent: *\nDisallow: /robots.txt'), 'https://a.test/page': PAGE });
  assert.equal(res.ok, true, 'robots.txt 경로를 막아도 robots.txt 자체 요청은 판정 대상이 아니다');
  assert.equal(res.log.filter((l) => l.href === 'https://a.test/robots.txt').length, 1);
});

test('첫 주소가 사설 주소면 robots도 본문도 요청 0(기존 SSRF 차단 우선)', async () => {
  const res = await run('http://private.test/page', {});
  assert.ok(res.error instanceof BlockedUrlError);
  assert.equal(res.log.length, 0);
});

test('opts 없는 기존 호출(proxy·image)은 robots를 요청하지 않음', async () => {
  log = [];
  routes = { 'https://a.test/robots.txt': txt('User-agent: *\nDisallow: /'), 'https://a.test/go': redirect('/img'), 'https://a.test/img': PAGE };
  const { response, finalUrl } = await safeFetch('https://a.test/go');
  assert.equal(response.status, 200);
  assert.equal(finalUrl.href, 'https://a.test/img');
  assert.deepEqual(log.map((l) => l.href), ['https://a.test/go', 'https://a.test/img']);
});

// ── QA023 P2: DNS 대기 중 abort ─────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('느린 DNS(160ms) + 전체 신호 15ms → 바로 끝남, 늦은 DNS 완료 뒤 robots·본문 요청 0', async () => {
  dnsDelay = { 'slow.test': 160 };
  const t0 = Date.now();
  const res = await run('https://slow.test/page', { 'https://slow.test/robots.txt': txt('User-agent: *\nAllow: /'), 'https://slow.test/page': PAGE }, { signal: AbortSignal.timeout(15) });
  const took = Date.now() - t0;
  assert.equal(res.ok, false);
  assert.ok(took < 100, `신호를 따라 일찍 끝나야 한다(걸린 시간 ${took}ms)`);
  await sleep(220); // 늦은 DNS 완료를 기다린 뒤에도
  assert.equal(log.length, 0, '늦게 끝난 DNS 뒤 robots·본문 요청이 없어야 한다');
  dnsDelay = {};
});

test('robots.txt 쪽 느린 DNS도 robots 5초·전체 신호를 따름 → 본문 요청 0', async () => {
  // 첫 주소 DNS는 빠르고, robots 요청이 쓰는 같은 호스트 두 번째 조회만 느리게
  let n = 0;
  const orig = dns.lookup;
  dns.lookup = async (host, o) => { n++; if (n === 2) await sleep(160); return orig(host, o); };
  const t0 = Date.now();
  const res = await run('https://b2.test/page', { 'https://b2.test/robots.txt': txt('User-agent: *\nAllow: /'), 'https://b2.test/page': PAGE }, { signal: AbortSignal.timeout(15) });
  const took = Date.now() - t0;
  dns.lookup = orig;
  assert.ok(res.error instanceof RobotsUnavailableError);
  assert.ok(took < 100, `걸린 시간 ${took}ms`);
  await sleep(220);
  assert.equal(log.length, 0);
});

test('이미 끝난 신호 → DNS 조회도 요청도 0', async () => {
  const ac = new AbortController();
  ac.abort();
  dnsCalls = 0;
  const res = await run('https://a.test/page', { 'https://a.test/robots.txt': txt(''), 'https://a.test/page': PAGE }, { signal: ac.signal });
  assert.equal(res.ok, false);
  assert.equal(dnsCalls, 0);
  assert.equal(log.length, 0);
});

test('성공하면 신호에 붙인 abort 리스너가 모두 정리됨(누수 0)', async () => {
  const ac = new AbortController();
  const s = ac.signal;
  let added = 0, removed = 0;
  const add = s.addEventListener.bind(s), rem = s.removeEventListener.bind(s);
  s.addEventListener = (t, f, o) => { if (t === 'abort') added++; return add(t, f, o); };
  s.removeEventListener = (t, f, o) => { if (t === 'abort') removed++; return rem(t, f, o); };
  const res = await run('https://a.test/go', { 'https://a.test/robots.txt': txt('User-agent: *\nAllow: /'), 'https://a.test/go': redirect('/end'), 'https://a.test/end': PAGE }, { signal: s });
  assert.equal(res.ok, true);
  assert.ok(added > 0, 'DNS 대기에 리스너를 붙여야 한다');
  assert.equal(removed, added, `붙인 ${added}개 = 뗀 ${removed}개`);
});

test('assertPublicUrl 공개 계약 그대로(신호 없이 호출, URL 반환)', async () => {
  const u = await safeFetchMod.assertPublicUrl('https://a.test/x');
  assert.equal(u.href, 'https://a.test/x');
  await assert.rejects(safeFetchMod.assertPublicUrl('http://private.test/'), BlockedUrlError);
});
