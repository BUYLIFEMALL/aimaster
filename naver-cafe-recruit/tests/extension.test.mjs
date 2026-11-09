import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findInvite, firstClubId, newLines, classify, judgeResponse, isBlocked } from '../extension/invite.mjs';
import { EXTENSION_OPERATIONS, allowedOrigin } from '../src/lib/extensionApi.ts';
import { boardFromUrl, parseGrade, cleanRows, cafeNameFromTitle } from '../extension/roster.mjs';
import { OPERATIONS, rpcFor } from '../src/lib/recruitApi.ts';

test('EX08 A-1 board address: new /cafes/<n>/menus/<n> and old ArticleList clubid/menuid; other pages are not boards', () => {
  assert.deepEqual(boardFromUrl('https://cafe.naver.com/f-e/cafes/30954788/menus/173'), { cafeId: '30954788', boardId: '173' });
  assert.deepEqual(boardFromUrl('https://cafe.naver.com/buylife?iframe_url=/ArticleList.nhn%3Fsearch.clubid=30954788%26search.menuid=173%26search.boardtype=L'), { cafeId: '30954788', boardId: '173' });
  assert.equal(boardFromUrl('https://cafe.naver.com/f-e/cafes/30954788/articles/12'), null, 'an article page is not a board list');
  assert.equal(boardFromUrl('https://open.kakao.com/o/x'), null);
});

test('EX09 A-1 rows: grade text, trimmed nicknames once, notices/own/too-long dropped, at most 50, nickname+grade only', () => {
  assert.equal(parseGrade('멤버등급 : 새싹멤버'), '새싹멤버');
  assert.equal(parseGrade(''), undefined);
  const rows = cleanRows([{ nickname: ' 꽃님이 ', member_grade: '새싹' }, { nickname: '꽃님이' }, { nickname: '바이라이프', notice: true }, { nickname: '나' }, { nickname: 'x'.repeat(41) }, { nickname: '' }], '나');
  assert.deepEqual(rows, [{ nickname: '꽃님이', member_grade: '새싹' }]);
  assert.equal(cleanRows(Array.from({ length: 60 }, (_, i) => ({ nickname: `n${i}` }))).length, 50);
  assert.equal(cafeNameFromTitle('바이라이프 : 네이버 카페'), '바이라이프');
});

test('EX10 A-1 server checks: extension may add roster rows (no ID fields); web may list the roster and save a Naver invite link', () => {
  const ok = { cafe_id: '30954788', board_id: '173', cafe_name: '바이라이프', rows: [{ nickname: '꽃님이', member_grade: '새싹' }] };
  assert.equal(EXTENSION_OPERATIONS.members_add(ok), true);
  assert.equal(EXTENSION_OPERATIONS.members_add({ ...ok, rows: [{ nickname: '꽃님이', naver_id: 'flower' }] }), false, 'no ID column');
  assert.equal(EXTENSION_OPERATIONS.members_add({ ...ok, rows: Array.from({ length: 51 }, (_, i) => ({ nickname: `n${i}` })) }), false);
  assert.equal(EXTENSION_OPERATIONS.members_add({ ...ok, cafe_id: 'buylife' }), false);
  assert.equal(OPERATIONS.members_list({}), true);
  assert.equal(OPERATIONS.invite_link_save({ invite_link: 'https://cafe.naver.com/buylife?invite=x' }), true);
  assert.equal(OPERATIONS.invite_link_save({ invite_link: '' }), true, 'empty clears the link');
  assert.equal(OPERATIONS.invite_link_save({ invite_link: 'https://evil.example/x' }), false);
  assert.equal(Object.hasOwn(OPERATIONS, 'members_add'), false, 'the web cannot add roster rows');
  assert.equal(rpcFor('members_add'), 'ncr_member_dispatch');
  assert.equal(rpcFor('next_target'), 'ncr_dispatch', 'existing operations keep the existing function');
});

// 실물 화면 문구: docs/DOM_CHECK_20261105.md §6
const STATIC = '카페 초대\n초대할 사람의 네이버 아이디를 입력하세요.\n내소식으로 초대알림이 전송됩니다.\n한 달에 최대 300명까지 초대할 수 있습니다.\n영리 목적의 광고를 전송하면 정보통신망법에 따라 처벌 받을 수 있습니다.';

test('EX01 invite menu: the cafe number comes from the sidebar invite link; cafes without it are skipped', () => {
  const r = findInvite(['https://cafe.naver.com/buylife?iframe_url=/ArticleList.nhn%3Fsearch.clubid=30954788', 'https://cafe.naver.com/buylife?iframe_url=/CafeInviteCheck.nhn%3Fm=check%26clubid=30954788']);
  assert.equal(r.cafeId, '30954788');
  assert.equal(r.how, 'href');
  assert.match(r.href, /CafeInviteCheck/);
  assert.equal(findInvite(['https://cafe.naver.com/buylife', 'https://open.kakao.com/x']), null);
});

// 2026-11-06 맥미니 실측(docs/INVITE_TEST_20261106.md §2): PC 카페 첫 화면의 「초대」는 href="#" + inviteMember() → 틀 이동, 링크 주소 없음.
test('EX11 invite menu without a link (PC cafe home): menu present + cafe number from the frame address; no menu or no number → skipped', () => {
  const hrefs = ['https://cafe.naver.com/buylife', 'https://cafe.naver.com/buylife#'];
  const page = { inviteMenu: true, cafeId: null, frameSrcs: ['https://cafe.naver.com/MyCafeIntro.nhn?clubid=30954788'] };
  const r = findInvite(hrefs, page);
  assert.equal(r.how, 'menu');
  assert.equal(r.cafeId, '30954788');
  assert.equal(r.href, null);
  assert.equal(r.framePath, '/CafeInviteCheck.nhn?m=check&clubid=30954788');
  assert.equal(findInvite(hrefs, { inviteMenu: false, frameSrcs: page.frameSrcs }), null, 'no invite menu → not a cafe we may invite into');
  assert.equal(findInvite(hrefs, { inviteMenu: true, frameSrcs: [] }), null, 'no cafe number anywhere');
  assert.equal(findInvite(['https://cafe.naver.com/buylife?iframe_url=/ArticleList.nhn%3Fsearch.clubid=30954788'], { inviteMenu: true }).cafeId, '30954788', 'falls back to board links');
  assert.equal(firstClubId(['https://cafe.naver.com/x', 'https://cafe.naver.com/ArticleList.nhn?search.clubid=12&x=1']), '12');
  assert.equal(firstClubId(['%E0%A4%A']), null, 'broken encoding does not throw');
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

// 4회차 뒤(2026-11-09): 네이버 초대 화면 원본 inviteNaverIds() 응답 분기 기준 판정
test('EX12 Naver invite response: explicit success / explicit refusal / limit / error / no permission / unknown', () => {
  const ok = (body) => ({ status: 200, body: JSON.stringify(body) });
  assert.equal(judgeResponse(null), null, 'no response seen -> fall back to text classify');
  assert.equal(judgeResponse(ok({ message: { result: { success: true } } })).result, 'sent');
  const no = judgeResponse(ok({ message: { result: { success: false, message: 'kkuleomi24:이미 가입한 회원입니다.' } } }));
  assert.equal(no.result, 'failed'); assert.match(no.detail, /이미 가입한 회원/); assert.doesNotMatch(no.detail, /kkuleomi24:/);
  assert.equal(judgeResponse(ok({ message: { result: { success: false, message: '이번 달 초대 가능 인원을 초과했습니다.' } } })).result, 'limited');
  const err = judgeResponse(ok({ message: { status: '500', error: { msg: '잠시 후 다시 시도해 주세요.' } } }));
  assert.equal(err.result, 'failed'); assert.equal(err.stop, true);
  assert.equal(judgeResponse(ok({})).result, 'limited', 'no message = no permission -> stop the day');
  assert.equal(judgeResponse({ status: 0, body: '' }).result, 'uncertain', 'network failure is never success');
  assert.equal(judgeResponse({ status: 200, body: '<html>' }).result, 'uncertain');
  assert.equal(judgeResponse(ok({ message: { foo: 1 } })).result, 'uncertain');
  assert.ok(judgeResponse(ok({ message: { result: { success: false, message: 'x'.repeat(500) } } })).detail.length <= 200);
});

test('EX13 invite frame code: no Event constructor, keyup+blur so Naver shows the reason, captcha stops before click, request hook restored', () => {
  const src = readFileSync(new URL('../extension/background.mjs', import.meta.url), 'utf8');
  const fn = src.slice(src.indexOf('async function inviteInFrame'), src.indexOf('// ── 실행 흐름'));
  assert.doesNotMatch(fn, /new Event\(/, 'window.Event is overwritten in the invite frame (round 3)');
  assert.match(fn, /createEvent\("HTMLEvents"\)/);
  assert.match(fn, /fire\("keyup"\)/); assert.match(fn, /input\.blur\(\)/);
  assert.doesNotMatch(fn, /btn_input_add[^\n]*click|addIdInvitationBlock\(/, '"아이디 추가" is never pressed');
  assert.ok(fn.indexOf('captcha_layer') < fn.indexOf('send.click()'), 'captcha check happens before the click');
  assert.match(fn, /#cafe_invitation_id_layer button\.btn_invite/, 'invite button is taken from the ID layer, not link/QR layers');
  assert.match(fn, /finally \{ XP\.open = origOpen; XP\.send = origSend; \}/, 'request observer is always removed');
  assert.doesNotMatch(fn, /fetch\(|CafeInvitationByIdAjax\.nhn\?/, 'never calls the Naver invite API directly');
  assert.match(src, /judgeResponse\(r\.net\) \|\| classify\(/, 'response decides first, text only as fallback');
});
