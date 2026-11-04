import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNaverIds, OPERATIONS, errorReply } from '../src/lib/recruitApi.ts';

test('RA01 pasted IDs: blog addresses, @ and @naver.com are reduced to the ID; duplicates and bad ones are separated', () => {
  const r = parseNaverIds('friend01\nhttps://blog.naver.com/Friend02, @friend03 friend04@naver.com friend01 \n 한글아이디 ab');
  assert.deepEqual(r.ids, ['friend01', 'friend02', 'friend03', 'friend04']);
  assert.deepEqual(r.invalid, ['한글아이디', 'ab']);
  assert.equal(parseNaverIds(Array.from({ length: 250 }, (_, i) => `user${i}x`).join('\n')).ids.length, 200);
});
test('RA02 the web can only add "known" people (the extract mode belongs to the extension), at most 200, valid IDs only', () => {
  assert.equal(OPERATIONS.targets_add({ source_mode: 'known', rows: [{ naver_id: 'friend01' }] }), true);
  assert.equal(OPERATIONS.targets_add({ source_mode: 'extract', rows: [{ naver_id: 'friend01' }] }), false);
  assert.equal(OPERATIONS.targets_add({ source_mode: 'known', rows: [{ naver_id: 'Bad Id' }] }), false);
  assert.equal(OPERATIONS.targets_add({ source_mode: 'known', rows: [{ naver_id: 'friend01', email: 'x@y.z' }] }), false, 'no extra fields such as e-mail');
  assert.equal(OPERATIONS.targets_add({ source_mode: 'known', rows: Array.from({ length: 201 }, (_, i) => ({ naver_id: `user${i}x` })) }), false);
});
test('RA03 settings: daily cap 1..25, valid minutes, booleans only; no hidden fields', () => {
  const ok = { mode_known: true, mode_promo: true, mode_extract: false, daily_cap: 20, active_start_minute: 540, active_end_minute: 1320 };
  assert.equal(OPERATIONS.settings_save(ok), true);
  assert.equal(OPERATIONS.settings_save({ ...ok, consent: true, mode_extract: true }), true);
  for (const bad of [{ ...ok, daily_cap: 26 }, { ...ok, daily_cap: 0 }, { ...ok, active_end_minute: 1440 }, { ...ok, mode_extract: 'yes' }, { ...ok, user_id: 'x' }]) assert.equal(OPERATIONS.settings_save(bad), false);
  assert.equal(Object.hasOwn(OPERATIONS, 'sent_mark'), false, 'the web cannot record invitations — only the extension after the real screen');
  assert.equal(Object.hasOwn(OPERATIONS, 'next_target'), false);
});
test('RA04 database errors become plain Korean messages without internal details', () => {
  assert.deepEqual(errorReply('NCR_EXTRACT_CONSENT_REQUIRED'), [409, '「카페 활동 회원」 방식을 켜려면 책임 고지에 동의해 주세요.']);
  assert.equal(errorReply('NCR_NOT_FOUND')[0], 404);
  assert.equal(errorReply('relation does not exist')[0], 503);
});
