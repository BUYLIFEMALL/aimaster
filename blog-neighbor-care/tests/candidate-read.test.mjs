import test from 'node:test';
import assert from 'node:assert/strict';
import { createCandidateRead } from '../src/lib/observation/candidateRead.mjs';

const url = 'https://blog.naver.com/other/123';
function setup() {
  const state = { time: 1000, actor: { memberId: 'm', deviceId: 'd', accountId: 'a', blogId: 'owner' },
    tab: { id: 7, url }, reads: 0, snapshots: [{ result: { ok: true, snapshot: { url, title: '제목', body: '본문', format: 'naver-visible-text-v1' } } }] };
  state.permit = { ...state.actor, id: 'p', revision: '1', operation: 'candidate_body_read', targetUrl: url,
    policyReference: 'offline synthetic fixture only', issuedAt: 0, expiresAt: 2000 };
  const deps = { now: () => state.time, identity: async () => state.actor,
    authorize: async () => state.permit,
    browser: { tabs: { query: async () => [state.tab], get: async () => state.tab }, scripting: {
      executeScript: async args => { state.reads++; assert.deepEqual(args.target, { tabId: 7, allFrames: true });
        assert.deepEqual(args.args, ['other']); state.during?.(); return state.snapshots; }
    } } };
  return { state, deps, run: () => createCandidateRead(deps)(url) };
}
test('CR01 default denies before any tab/body access', async () => {
  const { state, deps } = setup(); delete deps.authorize;
  deps.browser.tabs.query = async () => { throw new Error('must_not_query'); };
  await assert.rejects(createCandidateRead(deps)(url), /permission_required/); assert.equal(state.reads, 0);
});
test('CR02 exact approved scope gives preview without rights/AI consent', async () => {
  const s = setup(); const r = await s.run(); assert.equal(r.snapshot.body, '본문');
  assert.equal(r.rightsConfirmed, false); assert.equal(r.externalAiConsent, false); assert.equal(r.requiresMemberReview, true);
  assert.equal(s.state.reads, 1);
});
test('CR03 account/device/member/blog/operation/target and TTL mismatches deny', async () => {
  for (const patch of [{ memberId: 'x' }, { deviceId: 'x' }, { accountId: 'x' }, { blogId: 'x' },
    { operation: 'observe' }, { targetUrl: 'https://blog.naver.com/other/124' }, { expiresAt: 1000 },
    { issuedAt: 1001 }, { expiresAt: 300001 }, { expiresAt: NaN }, { policyReference: '' }, { revision: '' }]) {
    const s = setup(); Object.assign(s.state.permit, patch); await assert.rejects(s.run(), /permission_required/); assert.equal(s.state.reads, 0);
  }
});
test('CR04 tab navigation or active-tab switch during read discards body', async () => {
  for (const tab of [{ id: 7, url: 'https://blog.naver.com/other/124' }, { id: 8, url }]) {
    const s = setup(); s.state.during = () => { s.state.tab = tab; }; await assert.rejects(s.run(), /target_changed/);
  }
});
test('CR05 identity/revocation/revision/expiry changes discard body', async () => {
  for (const mutate of [s => { s.actor.memberId = 'x'; }, s => { s.permit = null; },
    s => { s.permit.revision = '2'; }, s => { s.time = 2000; }]) {
    const s = setup(); s.state.during = () => mutate(s.state); await assert.rejects(s.run()); assert.equal(s.state.reads, 1);
  }
});
test('CR06 reject oversized/ambiguous/incomplete bodies without truncation', async () => {
  for (const patch of [{ body: 'x'.repeat(6001) }, { body: '' }, { title: '' }, { format: 'summary' }]) {
    const s = setup(); Object.assign(s.state.snapshots[0].result.snapshot, patch); await assert.rejects(s.run());
  }
  const s = setup(); s.state.snapshots.push({ result: { ok: true, snapshot: { ...s.state.snapshots[0].result.snapshot, body: 'different' } } });
  await assert.rejects(s.run());
});
test('CR07 initial wrong URL/tab and identity fail before extraction', async () => {
  const s = setup(); s.state.tab.url = 'https://blog.naver.com/other'; await assert.rejects(s.run(), /target_not_active/);
  assert.equal(s.state.reads, 0); s.state.actor.deviceId = ''; await assert.rejects(s.run(), /identity_required/);
  await assert.rejects(createCandidateRead(s.deps)('https://evil.example/other/123'), /invalid_target/);
});
