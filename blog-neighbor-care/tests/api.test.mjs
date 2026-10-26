import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkHandler } from '../src/lib/work-api.ts';
import { evaluateProgramAccess } from '../src/lib/programAccess.ts';
const ID = '11111111-1111-4111-8111-111111111111';
function setup({ access = { allowed: true, userId: ID }, result = { data: { ok: true }, error: null } } = {}) {
  const calls = [];
  const handler = createWorkHandler({ authorize: async () => access,
    execute: async (...args) => { calls.push(args); return result; } });
  const send = (input, headers = {}) => handler(new Request('http://localhost:3000/api/work', {
    method: 'POST', headers: { origin: 'http://localhost:3000', 'content-type': 'application/json', ...headers },
    body: typeof input === 'string' ? input : JSON.stringify(input),
  }));
  return { calls, send };
}
test('인증 실패·권한 없음이면 DB를 호출하지 않음', async () => {
  for (const status of [401, 403]) {
    const { calls, send } = setup({ access: { allowed: false, status, error: '사용 불가' } });
    assert.equal((await send({ operation: 'settings' })).status, status); assert.equal(calls.length, 0);
  }
});
test('회원 ID는 인증 결과에서만 결합', async () => {
  const { calls, send } = setup(); const response = await send({ operation: 'settings' }, { 'x-user-id': 'attacker' });
  assert.equal(response.status, 200); assert.deepEqual(calls[0], [ID, 'settings', {}]);
  assert.match(response.headers.get('cache-control'), /no-store/);
});
test('소유자·상태·공급자 관찰값 주입 거절', async () => {
  const { calls, send } = setup();
  for (const input of [{ operation: 'settings', user_id: 'attacker' },
    { operation: 'configure', payload: { user_id: 'attacker' } },
    { operation: 'approve', payload: { id: ID, state: 'succeeded' } }]) assert.equal((await send(input)).status, 400);
  assert.equal(calls.length, 0);
});
test('선점·관찰·등록허가·성공보고는 회원 HTTP API에서 차단', async () => {
  const { calls, send } = setup();
  for (const operation of ['observe', 'claim', 'arm', 'verify_permit', 'result', '__proto__', 'constructor', 'toString']) {
    assert.equal((await send({ operation, payload: { id: ID, verified: true } })).status, 403);
  }
  assert.equal(calls.length, 0);
});
test('동일출처·JSON 조건 검증', async () => {
  const { calls, send } = setup();
  assert.equal((await send({ operation: 'settings' }, { origin: 'https://other.test' })).status, 403);
  assert.equal((await send({ operation: 'settings' }, { 'sec-fetch-site': 'cross-site' })).status, 403);
  assert.equal((await send('{}', { 'content-type': 'text/plain' })).status, 415); assert.equal(calls.length, 0);
});
test('프레임워크 내부URL과 전송Host가 달라도 실제동일출처만허용', async () => {
  const { send } = setup();
  assert.equal((await send({ operation: 'settings' }, { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' })).status, 200);
  assert.equal((await send({ operation: 'settings' }, { host: '127.0.0.1:3000', origin: 'https://other.test' })).status, 403);
});
test('깨진 JSON·배열·과도한 UTF8 입력은 거절', async () => {
  const { calls, send } = setup();
  assert.equal((await send('{')).status, 400); assert.equal((await send([])).status, 400);
  assert.equal((await send('가'.repeat(3000))).status, 413); assert.equal(calls.length, 0);
});
test('앱 상한·타입·빈 설정 검증', async () => {
  const { calls, send } = setup();
  for (const payload of [{ comment_cap: 31 }, { request_cap: -1 }, { like_cap: 1.5 },
    { comment_cap: '30' }, { enabled: 'true' }, { mode: 'other' }, {}]) {
    assert.equal((await send({ operation: 'configure', payload })).status, 400);
  }
  assert.equal(calls.length, 0);
  assert.equal((await send({ operation: 'configure', payload: { request_cap: 0, like_cap: 100, comment_cap: 30, mode: 'review' } })).status, 200);
});
test('작업 생성의 소유계정 참조·대상·종류·문장 검증', async () => {
  const { calls, send } = setup(); const base = { account_id: ID, neighbor_id: 'neighbor-a', post_id: '123', kind: 'comment', body: '시험 문장' };
  for (const patch of [{ account_id: 'bad' }, { neighbor_id: 'https://other.test' }, { kind: 'publish' },
    { post_id: 'javascript:1' }, { body: 'https://other.test' }, { body: '' }, { body: 'x'.repeat(4001) }, { actor_id: 'other' }]) {
    assert.equal((await send({ operation: 'create', payload: { ...base, ...patch } })).status, 400);
  }
  assert.equal(calls.length, 0); assert.equal((await send({ operation: 'create', payload: base })).status, 200);
});
test('다른 회원 작업과 준비 미완료를 안전한 오류로 반환', async () => {
  for (const [message, status] of [['BNC_NOT_FOUND', 404], ['BNC_LIVE_DISABLED', 409], ['BNC_ACCOUNT_REQUIRED', 409]]) {
    const { send } = setup({ result: { data: null, error: { message } } });
    assert.equal((await send({ operation: 'settings' })).status, status);
  }
});
test('DB 원문·토큰 등의 오류 상세를 응답에 노출하지 않음', async () => {
  const { send } = setup({ result: { data: null, error: { code: 'PGRST202', message: 'raw-private-db-detail' } } });
  const r = await send({ operation: 'settings' }); assert.equal(r.status, 503); assert.doesNotMatch(await r.text(), /raw-private/);
});
const defaults = { isAdmin: false, isSuspended: false, hasPhone: true, isFree: false,
  requiredGradeId: 'grade', hasActiveSubscription: false, hasIndividualGrant: false,
  userGradeSortOrder: 1, requiredGradeSortOrder: 1 };
test('공용 권한: 정지는 관리자보다 우선', () => {
  assert.equal(evaluateProgramAccess({ ...defaults, isAdmin: true, isSuspended: true }).allowed, false);
});
test('공용 권한: 관리자만 전화 예외, FREE도 전화 필수', () => {
  assert.equal(evaluateProgramAccess({ ...defaults, isAdmin: true, hasPhone: false }).allowed, true);
  assert.equal(evaluateProgramAccess({ ...defaults, isFree: true, hasPhone: false }).reason, 'phone_required');
});
test('공용 권한: 등급만으로는 열리지 않고 기간·구독을 확인', () => {
  assert.equal(evaluateProgramAccess(defaults).allowed, false);
  assert.equal(evaluateProgramAccess({ ...defaults, hasActiveSubscription: true }).allowed, true);
  assert.equal(evaluateProgramAccess({ ...defaults, hasIndividualGrant: true, individualGrantExpiresAt: '2100-01-01' }).allowed, true);
  assert.equal(evaluateProgramAccess({ ...defaults, hasIndividualGrant: true, individualGrantExpiresAt: '2000-01-01' }).allowed, false);
});
