import test from 'node:test';
import assert from 'node:assert/strict';
import { createReaderMemberHandler, createReaderExtensionHandler, hashSecret } from '../src/lib/reader/api.ts';
const USER = '11111111-1111-4111-8111-111111111111', DEVICE = '22222222-2222-4222-8222-222222222222';
const REQUEST = '33333333-3333-4333-8333-333333333333', TOKEN = 'a'.repeat(64), CODE = 'b'.repeat(32);
function setup(extra = {}) {
  const calls = [], accesses = [];
  const deps = { member: async () => ({ allowed: true, userId: USER }), user: async id => { accesses.push(id); return { allowed: true, userId: id }; },
    pairingOwner: async () => USER, device: async () => ({ userId: USER, deviceId: DEVICE }),
    rpc: async (...args) => { calls.push(args); return { data: { deviceId: DEVICE, blogId: 'my-blog' }, error: null }; }, ...extra };
  const member = createReaderMemberHandler(deps), extension = createReaderExtensionHandler(deps);
  const send = (handler, operation, payload = {}, headers = {}) => handler(new Request('http://localhost:3000/api/reader', {
    method: 'POST', headers: { origin: 'http://localhost:3000', 'content-type': 'application/json', ...headers }, body: JSON.stringify({ operation, payload }),
  }));
  return { calls, accesses, member, extension, m: (op, p, h) => send(member, op, p, h),
    e: (op, p, h) => send(extension, op, p, { origin: `chrome-extension://${'a'.repeat(32)}`, authorization: `Bearer ${TOKEN}`, ...h }) };
}
test('연결번호는128비트·서버RPC에는번호해시만전달', async () => {
  const s = setup(), r = await s.m('pair', { blog_id: 'MY-BLOG', owner_confirmed: true }), body = await r.json();
  assert.equal(r.status, 200); assert.match(body.code, /^[a-f0-9]{32}$/);
  assert.deepEqual(s.calls[0], [USER, 'pair_issue', { code_hash: hashSecret(body.code), blog_id: 'my-blog' }]);
  assert.match(r.headers.get('cache-control'), /no-store/);
});
test('연결번호 발급은회원인증/권한/출처·본인확인필수', async () => {
  const s = setup(); assert.equal((await s.m('pair', { blog_id: 'my-blog', owner_confirmed: false })).status, 400);
  assert.equal((await s.m('pair', { blog_id: 'my-blog', owner_confirmed: true }, { origin: 'https://evil.test' })).status, 403);
  const denied = setup({ member: async () => ({ allowed: false, status: 403, error: '권한 없음' }) });
  assert.equal((await denied.m('pair', { blog_id: 'my-blog', owner_confirmed: true })).status, 403);
  assert.equal(denied.calls.length, 0);
});
test('연결교환은현재회원권한재검사·토큰256비트한번반환·DB는해시', async () => {
  const s = setup(), r = await s.e('connect', { code: CODE, device_name: 'Edge', protocol: 1 }), body = await r.json();
  assert.equal(r.status, 200); assert.match(body.token, /^[a-f0-9]{64}$/); assert.deepEqual(s.accesses, [USER]);
  assert.deepEqual(s.calls[0], [USER, 'pair_connect', { code_hash: hashSecret(CODE), token_hash: hashSecret(body.token), device_name: 'Edge' }]);
});
test('DB실패후가짜연결번호/토큰성공반환금지', async () => {
  const s = setup({ rpc: async () => ({ data: null, error: { message: 'private-secret-db-info' } }) });
  for (const r of [await s.m('pair', { blog_id: 'my-blog', owner_confirmed: true }), await s.e('connect', { code: CODE, device_name: 'Edge', protocol: 1 })]) {
    assert.equal(r.status, 503); const text = await r.text(); assert.doesNotMatch(text, /private-secret|"token"|"code"/);
  }
});
test('pair코드없음/프로토콜오류/권한박탈은연결부작용없음', async () => {
  const absent = setup({ pairingOwner: async () => null });
  assert.equal((await absent.e('connect', { code: CODE, device_name: 'Edge', protocol: 1 })).status, 409); assert.equal(absent.calls.length, 0);
  const denied = setup({ user: async () => ({ allowed: false, status: 403, error: '정지' }) });
  assert.equal((await denied.e('connect', { code: CODE, device_name: 'Edge', protocol: 1 })).status, 403); assert.equal(denied.calls.length, 0);
  assert.equal((await absent.e('connect', { code: CODE, device_name: 'Edge', protocol: 2 })).status, 400);
});
test('확장요청은쿠키가아닌토큰으로회원/기기결합·매요청권한확인', async () => {
  const hashes = []; const s = setup({ device: async hash => { hashes.push(hash); return { userId: USER, deviceId: DEVICE }; } });
  assert.equal((await s.e('whoami', {})).status, 200); assert.equal((await s.e('status', { request_id: REQUEST })).status, 200);
  assert.deepEqual(hashes, [hashSecret(TOKEN), hashSecret(TOKEN)]); assert.deepEqual(s.accesses, [USER, USER]);
  assert.deepEqual(s.calls[1], [USER, 'status', { request_id: REQUEST, device_id: DEVICE }]);
});
test('토큰없이/잘못된토큰/웹출처는확장API접근거절', async () => {
  const s = setup();
  assert.equal((await s.e('whoami', {}, { authorization: '' })).status, 401);
  assert.equal((await s.e('whoami', {}, { authorization: 'Bearer invalid' })).status, 401);
  assert.equal((await s.e('whoami', {}, { origin: 'https://evil.test' })).status, 403);
  assert.equal((await setup({ device: async () => null }).e('whoami', {})).status, 401);
  assert.equal(s.calls.length, 0);
});
test('회원/확장입력의타회원·타기기·상태·worker오퍼레이션주입거절', async () => {
  const s = setup();
  for (const [op, p] of [['materials', { user_id: 'other' }], ['revoke', { device_id: DEVICE, user_id: 'other' }], ['cleanup', {}], ['pair_connect', {}]]) assert.equal((await s.m(op, p)).status, 400);
  for (const [op, p] of [['whoami', { device_id: DEVICE }], ['claim', {}], ['submit', { request_id: REQUEST, snapshot: {}, verified: true }], ['cleanup', {}]]) assert.equal((await s.e(op, p)).status, 400);
  assert.equal(s.calls.length, 0);
});
test('준비요청은안전한글주소·기기ID를서버가결합', async () => {
  const s = setup(); assert.equal((await s.e('prepare', { request_id: REQUEST, url: 'https://m.blog.naver.com/my-blog/123' })).status, 200);
  assert.deepEqual(s.calls[0], [USER, 'prepare', { device_id: DEVICE, request_id: REQUEST, blog_id: 'my-blog', post_id: '123' }]);
  assert.equal((await s.e('prepare', { request_id: REQUEST, url: 'https://blog.naver.com.evil.test/a/1' })).status, 400);
});
test('읽기본문은문자열로정리·HTML렌더링/AI/외부검증표시없음', async () => {
  const s = setup(); const snapshot = { url: 'https://blog.naver.com/my-blog/123', title: ' 가상 제목 ', body: ' if (a < b)\r\n  alert("data"); ', format: 'naver-visible-text-v1' };
  const r = await s.e('submit', { request_id: REQUEST, snapshot }), json = await r.json();
  assert.equal(r.status, 200); assert.equal(s.calls[0][2].body, 'if (a < b)\n  alert("data");');
  assert.equal(json.canAutoEngage, false); assert.equal(json.naverOwnershipIndependentlyVerified, false); assert.equal(json.aiAnalysisPerformed, false);
  for (const patch of [{ body: '' }, { body: 'a'.repeat(20001) }, { format: 'unknown' }, { user_id: 'other' }]) assert.equal((await s.e('submit', { request_id: REQUEST, snapshot: { ...snapshot, ...patch } })).status, 400);
});
test('재조회/만료/충돌등의상태는안전한409/404로반환', async () => {
  for (const [message, status] of [['BNC_NOT_FOUND', 404], ['BNC_READER_EXPIRED', 409], ['BNC_READER_CONTENT_CHANGED', 409], ['BNC_PAIR_INVALID', 409]]) {
    const s = setup({ rpc: async () => ({ data: null, error: { message } }) }); assert.equal((await s.e('whoami', {})).status, status);
  }
});
