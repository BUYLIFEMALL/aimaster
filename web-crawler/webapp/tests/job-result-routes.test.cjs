// T-07 F02·F03(2026-11-18): 결과 미리보기·다운로드 GET 처리 함수 — 실제 route.ts를 그대로 변환해 실행하고
// supabase(RLS 조회·profiles·Storage)와 next/server만 가짜로 바꾼다. 네트워크·DB 쓰기 0.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const JSZip = require('jszip');

const ROOT = path.join(__dirname, '..');
const DAY = 86400000;

// ── 가짜 의존성 ──
const NextResponse = {
  json: (body, init = {}) => ({ kind: 'json', body, status: init.status ?? 200, headers: init.headers ?? {} }),
  redirect: (url, status) => ({ kind: 'redirect', url, status }),
};
let access, jobs, profile, storageCalls, storageFile, signedUrl;
const rls = {
  from: (table) => {
    assert.equal(table, 'web_crawler_jobs');
    const f = {};
    const q = { select: () => q, eq: (k, v) => { f[k] = v; return q; }, maybeSingle: async () => ({ data: jobs.find((j) => j.id === f.id && j.user_id === f.user_id) ?? null, error: null }) };
    return q;
  },
};
const admin = {
  from: (table) => {
    assert.equal(table, 'profiles');
    const f = {};
    const q = { select: () => q, eq: (k, v) => { f[k] = v; return q; }, maybeSingle: async () => (typeof profile === 'function' ? profile(f.id) : profile) };
    return q;
  },
  storage: {
    from: () => ({
      download: async (p) => { storageCalls.push(['download', p]); return storageFile; },
      createSignedUrl: async (p) => { storageCalls.push(['sign', p]); return signedUrl; },
    }),
  },
};

const cache = {};
function load(rel, extra) {
  const file = path.join(ROOT, rel);
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const m = { exports: {} };
  new Function('module', 'exports', 'require', js)(m, m.exports, (id) => {
    if (id in extra) return extra[id];
    if (id === 'server-only') return {};
    if (id.startsWith('@/')) return (cache[id] ??= load(`src/${id.slice(2)}.ts`, extra));
    return require(id);
  });
  return m.exports;
}
const extra = {
  'next/server': { NextResponse },
  '@/lib/supabase/server': { createClient: async () => rls },
  '@/lib/supabase/admin': { createAdminClient: () => admin },
  '@/lib/access': { checkProgramAccessApi: async () => access },
};
const preview = load('src/app/api/jobs/[id]/preview/route.ts', extra).GET;
const download = load('src/app/api/jobs/[id]/download/route.ts', extra).GET;

async function xlsxBlob() {
  const zip = new JSZip();
  zip.file('xl/workbook.xml', '<workbook><sheets><sheet r:id="rId1" xmlns:r="x"/></sheets></workbook>');
  zip.file('xl/_rels/workbook.xml.rels', '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>');
  zip.file('xl/worksheets/sheet1.xml', '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>상품</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>사과</t></is></c></row></sheetData></worksheet>');
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  return { data: new Blob([bytes]), error: null };
}

const ME = 'user-me';
const recent = () => new Date(Date.now() - 2 * DAY).toISOString();
const old = () => new Date(Date.now() - 40 * DAY).toISOString();
const call = (fn, id) => fn(new Request('http://x/'), { params: Promise.resolve({ id }) });

beforeEach(async () => {
  access = { allowed: true, user: { id: ME } };
  jobs = [
    { id: 'mine', user_id: ME, status: 'completed', created_at: recent() },
    { id: 'mine-old', user_id: ME, status: 'completed', created_at: old() },
    { id: 'mine-running', user_id: ME, status: 'running', created_at: recent() },
    { id: 'mine-bad-date', user_id: ME, status: 'completed', created_at: 'not-a-date' },
    { id: 'theirs', user_id: 'user-other', status: 'completed', created_at: recent() },
  ];
  profile = { data: { retention_exempt: false }, error: null };
  storageCalls = [];
  storageFile = await xlsxBlob();
  signedUrl = { data: { signedUrl: 'https://signed.example/x' }, error: null };
});

for (const [name, fn] of [['preview', preview], ['download', download]]) {
  test(`${name}: 본인 최근 작업 → 성공, 본인 경로만`, async () => {
    const r = await call(fn, 'mine');
    if (name === 'preview') {
      assert.equal(r.status, 200);
      assert.deepEqual(r.body.rows, [['사과']]);
      assert.equal(r.headers['Cache-Control'], 'no-store');
    } else {
      assert.equal(r.kind, 'redirect');
      assert.equal(r.status, 302);
    }
    assert.deepEqual(storageCalls.map((c) => c[1]), [`${ME}/mine.xlsx`]);
  });

  test(`${name}: 다른 회원 작업 → 404, Storage 0`, async () => {
    const r = await call(fn, 'theirs');
    assert.equal(r.status, 404);
    assert.equal(storageCalls.length, 0);
  });

  test(`${name}: 권한 없음 → 접근 오류 그대로, Storage 0`, async () => {
    access = { allowed: false, error: '이용 권한이 없습니다.', status: 403 };
    const r = await call(fn, 'mine');
    assert.equal(r.status, 403);
    assert.equal(storageCalls.length, 0);
  });

  test(`${name}: 진행 중 → 409, Storage 0`, async () => {
    const r = await call(fn, 'mine-running');
    assert.equal(r.status, 409);
    assert.equal(storageCalls.length, 0);
  });

  test(`${name}: 일반 회원 30일 경과 → 410(삭제 단정 없는 조회 제한 문구), Storage 0`, async () => {
    const r = await call(fn, 'mine-old');
    assert.equal(r.status, 410);
    assert.ok(!/삭제/.test(r.body.error), r.body.error);
    assert.equal(storageCalls.length, 0);
  });

  test(`${name}: 보관 예외 회원(retention_exempt=true) 30일 경과도 조회됨`, async () => {
    profile = { data: { retention_exempt: true }, error: null };
    const r = await call(fn, 'mine-old');
    assert.ok(r.status === 200 || r.status === 302, String(r.status));
    assert.equal(storageCalls.length, 1);
  });

  for (const [label, p] of [
    ['profiles 조회 오류', { data: null, error: { message: 'connection reset' } }],
    ['profiles 행 없음', { data: null, error: null }],
    ['retention_exempt 칸 없음', { data: {}, error: null }],
    ['retention_exempt 잘못된 타입', { data: { retention_exempt: 'true' }, error: null }],
  ]) {
    test(`${name}: ${label} → 503(예외 아님으로 접지 않음), Storage 0`, async () => {
      profile = p;
      const r = await call(fn, 'mine');
      assert.equal(r.status, 503);
      assert.ok(!/connection reset/.test(JSON.stringify(r.body)), '원문 오류 노출 0');
      assert.equal(storageCalls.length, 0);
    });
  }

  test(`${name}: created_at이 잘못된 값 → 503, Storage 0`, async () => {
    const r = await call(fn, 'mine-bad-date');
    assert.equal(r.status, 503);
    assert.equal(storageCalls.length, 0);
  });

  test(`${name}: Storage 오류 → 고정 문구, 원문 노출 0`, async () => {
    storageFile = { data: null, error: { message: 'bucket secret path xyz' } };
    signedUrl = { data: null, error: { message: 'bucket secret path xyz' } };
    const r = await call(fn, 'mine');
    assert.equal(r.status, 404);
    assert.ok(!/secret/.test(JSON.stringify(r.body)));
  });
}

test('preview: 해석 중 예상 못 한 오류 → 500 고정 문구, 로그에도 원문·stack 0', async () => {
  storageFile = { data: { size: 10, arrayBuffer: async () => { throw new Error('RAW-INTERNAL-DETAIL /etc/secret'); } }, error: null };
  const logged = [];
  const orig = console.error;
  console.error = (...a) => logged.push(a);
  try {
    const r = await call(preview, 'mine');
    assert.equal(r.status, 500);
    assert.ok(!/RAW-INTERNAL|secret/.test(JSON.stringify(r.body)));
  } finally {
    console.error = orig;
  }
  const text = logged.map((a) => a.map((x) => (x instanceof Error ? `${x.message}${x.stack}` : String(x))).join(' ')).join('\n');
  assert.ok(!/RAW-INTERNAL|secret|at /.test(text), `로그: ${text}`);
});

test('preview: 너무 큰 파일 → 413, 해석 시도 0', async () => {
  let read = false;
  storageFile = { data: { size: 11 * 1024 * 1024, arrayBuffer: async () => { read = true; return new ArrayBuffer(0); } }, error: null };
  const r = await call(preview, 'mine');
  assert.equal(r.status, 413);
  assert.equal(read, false);
});
