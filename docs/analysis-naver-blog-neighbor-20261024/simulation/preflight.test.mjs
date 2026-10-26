import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePost, selectCandidates } from './candidates.mjs';
import { MAX_CAPS, QueueModel, kstDay } from './queue-model.mjs';

// 실제 검색 응답/회원 자료를 사용하지 않는다. 모의 실행에서 fetch도 차단한다.
let fetchAttempts = 0;
globalThis.fetch = () => { fetchAttempts++; throw new Error('network_forbidden_in_simulation'); };
test.after(() => assert.equal(fetchAttempts, 0));
const NOW = Date.parse('2026-10-26T03:00:00Z');
const ctx = { userId: 'member-a', observedActorId: 'actor-a', online: true };
const actorB = { ...ctx, observedActorId: 'actor-b' };
const profile = { userId: 'member-a', ownBlogId: 'actor-a', keywords: ['캠핑', '여행'], excludedBlogs: ['excluded'] };
const post = (blog, number, title = '캠핑 준비', date = '20261026') => ({
  title, description: '가상 검색 요약', bloggerlink: `https://blog.naver.com/${blog}`,
  link: `https://blog.naver.com/${blog}/${number}`, postdate: date,
});
const select = (items, extra = {}) => selectCandidates({ requesterId: 'member-a', profile, items, ...extra });
const model = (options = {}) => new QueueModel({ userId: 'member-a', actors: ['actor-a', 'actor-b'], enabled: true, policyAllowed: true, ...options });
function seed(queue, id, extra = {}, at = NOW) {
  const actorId = extra.actorId ?? 'actor-a';
  const owner = { ...ctx, observedActorId: actorId };
  queue.add(owner, { id, actorId, neighborId: 'neighbor-a', postId: '123', kind: 'comment', body: '가상 시험 문장', relationship: 'mutual', ...extra }, at);
  queue.approve(owner, id);
  return owner;
}
async function armed(queue, id = 'one', extra = {}, at = NOW) {
  const owner = seed(queue, id, extra, at);
  const token = await queue.claim(owner, id, 'device-a', at);
  return { owner, token: await queue.arm(owner, token, at + 1) };
}

test('F01 다른 회원 프로필로 후보를 만들 수 없음', () => {
  assert.throws(() => select([], { requesterId: 'member-b' }), /owner_mismatch/);
});
test('F02 본인·제외·무관·잘못된 주소/날짜를 빼고 블로그 중복을 최신 글로 합침', () => {
  const result = select([
    post('camp-a', '1', '캠핑 여행', '20261024'), post('camp-a', '2', '캠핑', '20261025'),
    post('camp-b', '3', '캠핑 여행', '20261025'), post('actor-a', '4'), post('excluded', '5'),
    post('food', '6', '가상 음식 이야기'), post('bad-date', '7', '캠핑', '20260230'),
    { ...post('evil', '8'), link: 'https://blog.naver.com.evil.test/evil/8' },
  ]);
  assert.deepEqual(result.candidates.map(x => [x.blogId, x.postId]), [['camp-b', '3'], ['camp-a', '2']]);
  assert.equal(result.rejected.length, 6);
  assert.equal(result.fullBodyAnalyzed, false);
  assert.equal(result.aiScoringPerformed, false);
  assert.ok(result.candidates.every(x => x.relationship === 'unknown' && !x.canAutoEngage));
});
test('F03 입력 키워드가 없으면 임의 후보를 추천하지 않음', () => {
  assert.throws(() => select([post('camp-a', '1')], { profile: { ...profile, keywords: [] } }), /preferences_required/);
});
test('F04 후보 최대20개·잘못된 제한값 거절', () => {
  const items = Array.from({ length: 30 }, (_, i) => post(`candidate-${i}`, String(i + 1)));
  assert.equal(select(items).candidates.length, 20);
  for (const limit of [0, 21, 1.5]) assert.throws(() => select(items, { limit }), /invalid_input/);
});
test('F05 PC·모바일·PostView 주소를 같은 글로 정규화', () => {
  const expected = { blogId: 'camp-a', postId: '123', url: 'https://blog.naver.com/camp-a/123' };
  for (const url of ['https://blog.naver.com/camp-a/123', 'http://m.blog.naver.com/camp-a/123',
    'https://blog.naver.com/PostView.naver?blogId=camp-a&logNo=123']) assert.deepEqual(parsePost(url), expected);
});
test('F06 유사 도메인·실행 URL·자격증명·다른 포트·잘못된 경로 거절', () => {
  for (const url of ['https://blog.naver.com.evil.test/a/1', 'javascript:alert(1)',
    'https://u:p@blog.naver.com/a/1', 'https://blog.naver.com:444/a/1',
    'https://blog.naver.com/a/%31', 'https://blog.naver.com/a/1/extra']) assert.equal(parsePost(url), null);
});
test('F07 검색 강조 태그를 제거하며 출력은 텍스트로만 사용', () => {
  const result = select([post('camp-a', '1', '<b>캠핑</b> &amp; 여행')]);
  assert.equal(result.candidates[0].title, '캠핑 & 여행');
  assert.equal(result.textOnly, true);
});
test('Q01 상한 기본20/100/30·0 허용·음수/최대초과/소수 거절', async () => {
  assert.deepEqual(model().settings().caps, MAX_CAPS);
  for (const [kind, max] of Object.entries(MAX_CAPS)) {
    for (const value of [-1, max + 1, 0.5]) assert.throws(() => model({ caps: { [kind]: value } }), { code: 'invalid_cap' });
  }
  const q = model({ caps: { comment: 0 } }); seed(q, 'one');
  await assert.rejects(q.claim(ctx, 'one', 'd', NOW), { code: 'daily_cap' });
});
test('Q02 남은1개를 두 기기가 동시에 선점해도 한 건만 진행', async () => {
  const q = model({ caps: { comment: 1 } }); seed(q, 'one'); seed(q, 'two', { neighborId: 'neighbor-b' });
  const outcomes = await Promise.allSettled([q.claim(ctx, 'one', 'device-a', NOW), q.claim(ctx, 'two', 'device-b', NOW)]);
  assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(outcomes.find(x => x.status === 'rejected').reason.code, 'daily_cap');
  assert.deepEqual(q.usage(kstDay(NOW), 'comment'), { reserved: 1, succeeded: 0 });
});
test('Q03 계정·글·댓글종류를 바꿔도 같은 이웃의 당일 슬롯은1개', async () => {
  const q = model(); seed(q, 'one'); seed(q, 'two', { actorId: 'actor-b', postId: '456', kind: 'reply' });
  const outcomes = await Promise.allSettled([q.claim(ctx, 'one', 'a', NOW), q.claim(actorB, 'two', 'b', NOW)]);
  assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(outcomes.find(x => x.status === 'rejected').reason.code, 'neighbor_day_cap');
});
test('Q04 성공 후 후속 답글에도 당일 댓글 슬롯을 유지', async () => {
  const q = model(); const { token } = await armed(q);
  await q.result(ctx, token, 'success', { matched: true }); seed(q, 'reply', { kind: 'reply', postId: '456' });
  await assert.rejects(q.claim(ctx, 'reply', 'd', NOW + 100), { code: 'neighbor_day_cap' });
});
test('Q05 KST 자정을 넘은 허가로 실행할 수 없음', async () => {
  const at = Date.parse('2026-10-26T14:59:59Z'); const q = model(); const { token } = await armed(q, 'one', {}, at);
  assert.equal(q.canExecute(ctx, token, at + 500), true);
  assert.equal(q.canExecute(ctx, token, at + 1_001), false);
  assert.equal(kstDay(at), '2026-10-26'); assert.equal(kstDay(at + 1_001), '2026-10-27');
});
test('Q06 선점 후 상한을 낮추면 이전 설정의 승인으로 등록 불가', async () => {
  const q = model(); seed(q, 'one'); const token = await q.claim(ctx, 'one', 'd', NOW);
  q.setSettings(ctx, { caps: { comment: 0 } });
  await assert.rejects(q.arm(ctx, token, NOW + 1), { code: 'approval_changed' });
  assert.equal(q.canExecute(ctx, token, NOW + 2), false);
});
test('S01 선점 만료 후 새 세대만 유효하며 예전 기기는 거절', async () => {
  const q = model(); seed(q, 'one'); const old = await q.claim(ctx, 'one', 'a', NOW);
  const current = await q.claim(ctx, 'one', 'b', NOW + 60_001);
  assert.equal(current.generation, old.generation + 1);
  await assert.rejects(q.arm(ctx, old, NOW + 60_002), { code: 'stale_claim' });
  await q.arm(ctx, current, NOW + 60_002);
  assert.deepEqual(q.usage(kstDay(NOW), 'comment'), { reserved: 1, succeeded: 0 });
});
test('S02 결과 불명 작업은 재실행·할당량 반환을 하지 않음', async () => {
  const q = model(); const { token } = await armed(q);
  await q.result(ctx, token, 'uncertain');
  await assert.rejects(q.claim(ctx, 'one', 'other', NOW + 100_000), { code: 'effect_unconfirmed' });
  seed(q, 'two', { postId: '456' });
  await assert.rejects(q.claim(ctx, 'two', 'other', NOW + 100_000), { code: 'neighbor_day_cap' });
  assert.deepEqual(q.usage(kstDay(NOW), 'comment'), { reserved: 1, succeeded: 0 });
});
test('S03 등록 허가 후 기기가 사라져도 lease 만료만으로 재선점 불가', async () => {
  const q = model(); const { token } = await armed(q);
  await assert.rejects(q.claim(ctx, 'one', 'b', NOW + 100_000), { code: 'effect_unconfirmed' });
  assert.equal(q.canExecute(ctx, token, NOW + 100_000), false);
  assert.equal(q.usage(kstDay(NOW), 'comment').reserved, 1);
});
test('S04 성공 중복 보고는1번만 계산·늦은 실패로 되돌림 불가', async () => {
  const q = model(); const { token } = await armed(q);
  await q.result(ctx, token, 'success', { matched: true }); await q.result(ctx, token, 'success', { matched: true });
  assert.deepEqual(q.usage(kstDay(NOW), 'comment'), { reserved: 0, succeeded: 1 });
  await assert.rejects(q.result(ctx, token, 'uncertain'), { code: 'terminal_result' });
});
test('S05 이미 공감했거나 공감 상태를 모르면 토글 동작 없이 건너뜀', async () => {
  for (const liked of [true, null]) {
    const q = model(); const { token } = await armed(q, 'one', { kind: 'like', liked });
    assert.equal(token.skipped, true); assert.equal(q.canExecute(ctx, token, NOW + 2), false);
    assert.deepEqual(q.usage(kstDay(NOW), 'like'), { reserved: 0, succeeded: 0 });
  }
});
test('S06 신청 성공은 수락이 아닌 대기이며 댓글 대상이 아님', async () => {
  const q = model(); const { token } = await armed(q, 'one', { kind: 'request', relationship: 'unknown' });
  const done = await q.result(ctx, token, 'success', { matched: true }); assert.equal(done.relationship, 'pending');
  seed(q, 'comment', { relationship: done.relationship });
  await assert.rejects(q.claim(ctx, 'comment', 'd', NOW + 10), { code: 'not_mutual' });
});
test('S07 성공 근거가 일치하지 않으면 클릭 보고만으로 성공 처리 안 함', async () => {
  const q = model(); const { token } = await armed(q);
  const result = await q.result(ctx, token, 'success'); assert.equal(result.state, 'uncertain');
  assert.deepEqual(q.usage(kstDay(NOW), 'comment'), { reserved: 1, succeeded: 0 });
});
test('S08 결과 불명 뒤 일치하는 근거를 확인하면 재클릭 없이 성공 확정', async () => {
  const q = model(); const { token } = await armed(q);
  await q.result(ctx, token, 'uncertain');
  assert.equal((await q.result(ctx, token, 'success', { matched: true })).state, 'succeeded');
  assert.deepEqual(q.usage(kstDay(NOW), 'comment'), { reserved: 0, succeeded: 1 });
});
test('S09 미실행 근거가 있을 때만 예약 반환·근거 없으면 결과 불명', async () => {
  const q = model(); const { token } = await armed(q);
  assert.equal((await q.result(ctx, token, 'no_effect', { provedNoEffect: true })).state, 'failed_no_effect');
  assert.equal(q.usage(kstDay(NOW), 'comment').reserved, 0);
  const other = model(); const next = await armed(other);
  assert.equal((await other.result(ctx, next.token, 'no_effect')).state, 'uncertain');
  assert.equal(other.usage(kstDay(NOW), 'comment').reserved, 1);
});
test('A01 다른 회원·실제 실행 계정 불일치는 거절', async () => {
  const q = model(); seed(q, 'one');
  await assert.rejects(q.claim({ ...ctx, userId: 'member-b' }, 'one', 'd', NOW), { code: 'owner_mismatch' });
  await assert.rejects(q.claim(actorB, 'one', 'd', NOW), { code: 'account_mismatch' });
});
test('A02 승인 후 문장을 수정하면 이전 승인 사용 불가', async () => {
  const q = model(); seed(q, 'one'); q.edit(ctx, 'one', '수정한 가상 문장');
  await assert.rejects(q.claim(ctx, 'one', 'd', NOW), { code: 'approval_changed' });
  assert.equal(q.snapshot(ctx, 'one').state, 'draft');
});
test('A03 auto로 바꿔도 기존 미승인 문장은 자동 준비 상태가 되지 않음', async () => {
  const q = model(); q.add(ctx, { id: 'one', actorId: 'actor-a', neighborId: 'neighbor-a', kind: 'comment' }, NOW);
  q.setSettings(ctx, { mode: 'auto' }); assert.equal(q.snapshot(ctx, 'one').state, 'draft');
  await assert.rejects(q.claim(ctx, 'one', 'd', NOW), { code: 'approval_changed' });
});
test('A05 다른 기기에서 멈추면 등록 직전 허가가 거절됨', async () => {
  const q = model(); seed(q, 'one'); const token = await q.claim(ctx, 'one', 'a', NOW);
  q.setSettings(ctx, { enabled: false }); await assert.rejects(q.arm(ctx, token, NOW + 1), { code: 'stopped' });
});
test('A06 네트워크 불가·정책 미확인·서로이웃 해제는 실행 불가', async () => {
  const q = model(); seed(q, 'one');
  await assert.rejects(q.claim({ ...ctx, online: false }, 'one', 'a', NOW), { code: 'offline' });
  const token = await q.claim(ctx, 'one', 'a', NOW);
  q.observe(ctx, 'one', { relationship: 'removed' });
  await assert.rejects(q.arm(ctx, token, NOW + 1), { code: 'not_mutual' });
  const blocked = model({ policyAllowed: false }); seed(blocked, 'one');
  await assert.rejects(blocked.claim(ctx, 'one', 'a', NOW), { code: 'policy_unverified' });
});
test('A08 멈춘 뒤 도착한 실제 결과는 취소로 바꾸지 않고 대조', async () => {
  const q = model(); const { token } = await armed(q); q.setSettings(ctx, { enabled: false });
  assert.equal(q.canExecute(ctx, token, NOW + 2), false);
  assert.equal((await q.result(ctx, token, 'success', { matched: true })).state, 'succeeded');
});
test('D01 최초 생성30일 만료 뒤 실행 불가·수정으로 만료 연장 안 함', async () => {
  const q = model(); seed(q, 'one'); const expiry = q.snapshot(ctx, 'one').expiresAt;
  q.edit(ctx, 'one', '변경 문장'); q.approve(ctx, 'one'); assert.equal(q.snapshot(ctx, 'one').expiresAt, expiry);
  await assert.rejects(q.claim(ctx, 'one', 'd', expiry), { code: 'content_expired' });
});
test('S10 공감의 다른 작업ID 재생성도 같은 동작 예약을 중복 확보하지 못함', async () => {
  const q = model(); seed(q, 'one', { kind: 'like', liked: false }); seed(q, 'two', { kind: 'like', liked: false });
  await q.claim(ctx, 'one', 'a', NOW); await assert.rejects(q.claim(ctx, 'two', 'b', NOW), { code: 'duplicate_action' });
});
test('F08 잘못된 날짜 타입·중복 식별 쿼리를 후보로 사용하지 않음', () => {
  assert.equal(select([{ ...post('camp-a', '1'), postdate: 20261026 }]).candidates.length, 0);
  assert.equal(parsePost('https://blog.naver.com/PostView.naver?blogId=a&blogId=b&logNo=1'), null);
  assert.equal(parsePost('https://blog.naver.com/PostView.naver?blogId=a&logNo=1&logNo=2'), null);
});
test('Q07 동시에100건을 요청해도 댓글30개 예약을 넘지 않음', async () => {
  const q = model();
  for (let i = 0; i < 100; i++) seed(q, `job-${i}`, { neighborId: `neighbor-${i}` });
  const outcomes = await Promise.allSettled(Array.from({ length: 100 }, (_, i) => q.claim(ctx, `job-${i}`, `device-${i}`, NOW)));
  assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 30);
  assert.equal(outcomes.filter(x => x.status === 'rejected' && x.reason.code === 'daily_cap').length, 70);
  assert.deepEqual(q.usage(kstDay(NOW), 'comment'), { reserved: 30, succeeded: 0 });
});
