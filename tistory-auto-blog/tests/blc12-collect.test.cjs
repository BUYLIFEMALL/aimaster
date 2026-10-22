// v1.86 (BLC-12): 글감 URL 수집 보안(공용 safe-fetch)·크기 제한·연도 보정(공용 year-policy)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadTs(file, mockRequire) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function (exports, require, module) { ${output}\n})`)(module.exports, mockRequire, module);
  return module.exports;
}

const year = loadTs('utils/yearPolicy.ts', () => ({}));
const safe = loadTs('utils/safeFetch.ts', (name) => (name === 'server-only' ? {} : require(name)));
const collector = loadTs('utils/ai/collector.ts', (name) => {
  if (name === 'server-only') return {};
  if (name === '../safeFetch') return safe;
  if (name === '../yearPolicy') return year;
  return require(name);
});

test('내부·사설 주소와 http가 아닌 주소는 가져오지 않는다', async () => {
  for (const url of ['http://127.0.0.1/', 'http://localhost:3000/', 'http://10.0.0.5/', 'http://192.168.0.1/admin', 'http://169.254.169.254/latest/meta-data', 'http://[::1]/', 'file:///etc/passwd', 'http://user:pw@example.com/']) {
    await assert.rejects(() => collector.fetchUrlText(url), (error) => /내부|사설|http 또는 https|인증 정보|URL/.test(error.message), url);
  }
});

test('3MB를 넘는 페이지는 중단하고 안내한다', async () => {
  const big = new Response(new Uint8Array(collector.FETCH_MAX_BYTES + 10));
  await assert.rejects(() => collector.readLimited(big), /3MB/);
  const declared = new Response('x', { headers: { 'content-length': String(collector.FETCH_MAX_BYTES + 1) } });
  await assert.rejects(() => collector.readLimited(declared), /3MB/);
  const small = await collector.readLimited(new Response('안녕하세요'));
  assert.equal(new TextDecoder().decode(small), '안녕하세요');
  assert.equal(collector.FETCH_TIMEOUT_MS, 15000);
});

test('제목·태그의 과거 연도는 올해로, 본문의 과거 사실은 보존한다', () => {
  assert.equal(year.sanitizeYear('2024년 청년 지원금 총정리', 2026), '2026년 청년 지원금 총정리');
  assert.equal(year.sanitizeYear('#2025트렌드 #캠핑', 2026), '#2025트렌드 #캠핑'); // 태그 칩 글자는 붙은 숫자를 건드리지 않음
  assert.equal(year.sanitizeBodyYear('2024년 기준 신청 방법입니다.', 2026), '2026년 기준 신청 방법입니다.');
  assert.equal(year.sanitizeBodyYear('이 제도는 2022년에 시행됐다.', 2026), '이 제도는 2022년에 시행됐다.');
  assert.equal(year.sanitizeBodyYear('2020~2022년 자료', 2026), '2020~2022년 자료');
});
