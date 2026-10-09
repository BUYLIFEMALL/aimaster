// 최상위 규칙 검사: 네이버 트렌드/검색은 회원 본인 키만 쓴다(운영자 공용 환경변수 키 금지). 네트워크 없음.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
for (const f of ['trend.ts', 'search.ts']) {
  const src = fs.readFileSync(path.resolve(__dirname, '../src/lib/actions', f), 'utf8');
  assert.equal(/NAVER_TREND|process\.env\.NAVER/.test(src), false, f + ': 운영자 공용 네이버 키를 읽으면 안 됨');
  assert.ok(/resolveApiKey\(supabase, user\.id, "naver_client_id"\)/.test(src), f + ': 본인 Client ID 조회 필요');
  assert.ok(/resolveApiKey\(supabase, user\.id, "naver_client_secret"\)/.test(src), f + ': 본인 Client Secret 조회 필요');
  assert.ok(src.indexOf('resolveApiKey') < src.search(/getCached(Trend|Search)\(/), f + ': 캐시 읽기 전에 본인 키 확인');
}
console.log('naver own key ok');
