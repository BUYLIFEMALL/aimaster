// 최상위 규칙 검사: 인스타 연결은 회원 본인 Meta 앱만 쓴다(운영자 공용 META_APP_* 환경변수 금지). 네트워크 없음.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8');
const client = read('src/lib/instagram/client.ts');
assert.equal(/process\.env\.META_APP|getEnv\(["']META_APP/.test(client), false, 'client.ts가 운영자 META_APP_*를 읽으면 안 됨');
// 회원 본인 앱 ID·시크릿을 인자로 받는지 확인. 2026-10-16 옛 주소 정리 대비로 콜백 주소(redirectUri) 인자가 뒤에 추가돼 그 뒤 인자는 허용(2026-10-18 시험 보완)
assert.ok(/getFacebookAuthorizeUrl\(state: string, appId: string[,)]/.test(client));
assert.ok(/exchangeFacebookCode\(code: string, appId: string, appSecret: string[,)]/.test(client));
const cb = read('src/app/api/instagram/callback/route.ts');
assert.ok(/resolveApiKey\(supabase, user\.id, "meta_app_id"\)/.test(cb) && /resolveApiKey\(supabase, user\.id, "meta_app_secret"\)/.test(cb), '콜백은 본인 키를 읽어야 함');
const acc = read('src/lib/actions/accounts.ts');
assert.ok(acc.indexOf('resolveApiKey(supabase, user.id, "meta_app_id")') < acc.indexOf('getFacebookAuthorizeUrl('), '연결 시작 전에 본인 앱 확인');
console.log('own meta app ok');
