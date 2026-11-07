// U10 2차: 분석 결과 → 업무 워크스페이스 「받은 업무」 내용(순수 함수, 실제 TS 파일을 그대로 실행). 네트워크·DB 없음.
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const out = await build({ entryPoints: ['lib/workInboxContent.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
const { analysisInboxContent, kstDate } = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok', name); };

ok('KST date', () => { assert.equal(kstDate('2026-11-06T16:30:00Z'), '2026-11-07'); assert.equal(kstDate(null), null); });

ok('title, summary and top results', () => {
  const c = analysisInboxContent({ keyword: ' 공동구매 ', summaryText: '경쟁사 A가 강함', createdAt: '2026-11-06T16:30:00Z', totalResults: 1200,
    topResults: [{ position: 1, title: '[가게] 공동구매', domain: 'a.com', link: 'https://a.com/x' }, { position: 2, title: null, domain: 'b.com', link: 'javascript:alert(1)' }] });
  assert.equal(c.title, '경쟁사 분석 — 공동구매 (2026-11-07)');
  assert.ok(c.bodyMd.includes('경쟁사 A가 강함'));
  assert.ok(c.bodyMd.includes('- 1위 [가게 공동구매](https://a.com/x) · a.com'));
  assert.ok(c.bodyMd.includes('- 2위 b.com · b.com') && !c.bodyMd.includes('javascript:'));
  assert.deepEqual({ ...c.data }, { 키워드: '공동구매', 분석일: '2026-11-07', '검색결과 수': 1200 });
  assert.equal(c.data['채널'], undefined); // 캘린더 대상 아님
});

ok('no results and empty keyword', () => {
  const c = analysisInboxContent({ keyword: '', summaryText: '', createdAt: 'bad' });
  assert.equal(c.title, '경쟁사 분석 — 키워드');
  assert.ok(c.bodyMd.includes('(분석 내용 없음)') && !c.bodyMd.includes('상위 검색결과'));
});

console.log(`work-inbox content: ${n} passed`);
