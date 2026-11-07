// U10 2차: 수집 작업 → 업무 워크스페이스 「받은 업무」 내용(순수 함수, 실제 TS 파일을 그대로 실행). 네트워크·DB 없음.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/workInboxContent.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = { exports: {} };
new Function('module', 'exports', js)(m, m.exports);
const { crawlJobInboxContent, kstDate } = m.exports;
const JOBS = 'https://web-crawler-saas.buylife.xyz/jobs';

test('KST date', () => {
  assert.equal(kstDate('2026-11-06T16:30:00Z'), '2026-11-07');
  assert.equal(kstDate(null), null);
});

test('completed job: title with host and rows, data for a table row, no temporary file link', () => {
  const c = crawlJobInboxContent({ url: 'https://www.example.com/list?page=1', target_fields: ['상품명', '가격'], row_count: 1234, completed_at: '2026-11-06T16:30:00Z', created_at: '2026-11-06T10:00:00Z' }, JOBS);
  assert.equal(c.title, '웹 수집 — example.com (1,234행)');
  assert.deepEqual({ ...c.data }, { 주소: 'https://www.example.com/list?page=1', '행 수': 1234, '수집 항목': '상품명, 가격', 완료일: '2026-11-07' });
  assert.ok(c.bodyMd.includes(JOBS));
  assert.ok(!/token=|sign/.test(c.bodyMd));
  assert.ok(!c.bodyMd.includes('⚠️'));
});

test('PII warning, missing rows/fields and bad url', () => {
  const c = crawlJobInboxContent({ url: 'not a url', target_fields: null, row_count: null, completed_at: null, created_at: '2026-11-01T00:00:00Z', pii_warning: true }, JOBS);
  assert.equal(c.title, '웹 수집 — not a url (0행)');
  assert.equal(c.data['완료일'], '2026-11-01');
  assert.ok(c.bodyMd.includes('- 수집 항목: -') && c.bodyMd.includes('⚠️'));
});
