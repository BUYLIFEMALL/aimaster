import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findInvite, newLines, classify, isBlocked } from '../extension/invite.mjs';
import { EXTENSION_OPERATIONS, allowedOrigin } from '../src/lib/extensionApi.ts';

// 실물 화면 문구: docs/DOM_CHECK_20261105.md §6
const STATIC = '카페 초대\n초대할 사람의 네이버 아이디를 입력하세요.\n내소식으로 초대알림이 전송됩니다.\n한 달에 최대 300명까지 초대할 수 있습니다.\n영리 목적의 광고를 전송하면 정보통신망법에 따라 처벌 받을 수 있습니다.';

test('EX01 invite menu: the cafe number comes from the sidebar invite link; cafes without it are skipped', () => {
  const r = findInvite(['https://cafe.naver.com/buylife?iframe_url=/ArticleList.nhn%3Fsearch.clubid=30954788', 'https://cafe.naver.com/buylife?iframe_url=/CafeInviteCheck.nhn%3Fm=check%26clubid=30954788']);
  assert.equal(r.cafeId, '30954788');
  assert.match(r.href, /CafeInviteCheck/);
  assert.equal(findInvite(['https://cafe.naver.com/buylife', 'https://open.kakao.com/x']), null);
});

test('EX02 the always-visible guide text (300 per month, advertising warning) never decides the result', () => {
  assert.deepEqual(newLines(STATIC, STATIC), []);
  assert.equal(classify(newLines(STATIC, STATIC)).result, 'uncertain');
  assert.deepEqual(newLines(STATIC, `${STATIC}\n초대를 보냈습니다.`), ['초대를 보냈습니다.']);
});

test('EX03 results: sent / failed for that person / limited stops the day / anything else is uncertain', () => {
  assert.equal(classify(['초대를 보냈습니다.']).result, 'sent');
  assert.equal(classify(['초대알림을 전송했습니다.']).result, 'sent');
  assert.equal(classify(['존재하지 않는 아이디입니다.']).result, 'failed');
  assert.equal(classify(['이미 가입한 회원입니다.']).result, 'failed');
  assert.equal(classify(['이번 달 초대 가능 인원을 초과했습니다.']).result, 'limited');
  assert.equal(classify(['일시적으로 제한되었습니다.']).result, 'limited');
  const u = classify(['잠시 후 다시 시도해 주세요.']);
  assert.equal(u.result, 'uncertain');
  assert.match(u.detail, /결과 확인 못 함/);
  assert.ok(classify(['x'.repeat(5000)]).detail.length <= 200, 'detail fits the 200-char column');
});

test('EX04 stop signals: login page, captcha, restriction', () => {
  assert.equal(isBlocked('', 'https://nid.naver.com/nidlogin.login'), true);
  assert.equal(isBlocked('자동입력 방지 문자를 입력해 주세요', 'https://cafe.naver.com/x'), true);
  assert.equal(isBlocked('로그인이 필요합니다', 'https://cafe.naver.com/x'), true);
  assert.equal(isBlocked(STATIC, 'https://cafe.naver.com/x'), false);
});

test('EX05 server route: the extension can only ask for the next person and record a result', () => {
  assert.equal(EXTENSION_OPERATIONS.next_target({ cafe_id: '30954788' }), true);
  assert.equal(EXTENSION_OPERATIONS.next_target({ cafe_id: 'buylife' }), false, 'cafe number only');
  assert.equal(EXTENSION_OPERATIONS.sent_mark({ cafe_id: '30954788', naver_id: 'friend01', result: 'sent', detail: '초대를 보냈습니다.' }), true);
  assert.equal(EXTENSION_OPERATIONS.sent_mark({ cafe_id: '30954788', naver_id: 'friend01', result: 'uncertain' }), false);
  assert.equal(EXTENSION_OPERATIONS.sent_mark({ cafe_id: '30954788', naver_id: 'Bad Id', result: 'sent' }), false);
  assert.equal(EXTENSION_OPERATIONS.sent_mark({ cafe_id: '30954788', naver_id: 'friend01', result: 'sent', email: 'x' }), false);
  for (const op of ['targets_add', 'targets_review_all', 'settings_save']) assert.equal(Object.hasOwn(EXTENSION_OPERATIONS, op), false, `${op} is web-only`);
});

test('EX06 cookie route accepts only the extension or the same site', () => {
  const self = 'https://naver-cafe-recruit.buylife.xyz';
  assert.equal(allowedOrigin('chrome-extension://abcdefghijklmnopabcdefghijklmnop', self), true);
  assert.equal(allowedOrigin(self, self), true);
  assert.equal(allowedOrigin('https://evil.example', self), false);
  assert.equal(allowedOrigin(null, self), false);
});

test('EX07 manifest: program name, version matches lib/version.ts, only the program and cafe hosts', () => {
  const m = JSON.parse(readFileSync(new URL('../extension/manifest.json', import.meta.url), 'utf8'));
  const v = /APP_VERSION = "(v\d+\.\d{2})"/.exec(readFileSync(new URL('../src/lib/version.ts', import.meta.url), 'utf8'))[1];
  assert.equal(m.name, '네이버 카페 회원 모집 자동화');
  assert.equal(m.version_name, v);
  assert.deepEqual(m.host_permissions, ['https://naver-cafe-recruit.buylife.xyz/*', 'https://cafe.naver.com/*']);
});
