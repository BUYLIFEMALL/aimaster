import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { inspectVisiblePost, chooseSnapshot, parsePost } from '../extension/extractor.mjs';
import { createReaderController, SITE } from '../extension/background.mjs';
const URL = 'https://blog.naver.com/my-blog/123', TOKEN = 'a'.repeat(64), DEVICE = 'device-a';
const snapshot = { url: URL, title: '가상 제목', body: '가상 본문', format: 'naver-visible-text-v1' };
function extract(html, url = URL, owner = 'my-blog', hidden = false) {
  const { document } = parseHTML(html);
  // DOM implementation has no layout. Visibility is the only simulated DOM capability.
  document.querySelectorAll('*').forEach(el => { el.getClientRects = () => hidden ? [] : [{}]; });
  return vm.runInNewContext(`(${inspectVisiblePost.toString()})(${JSON.stringify(owner)})`, { document, location: { href: url }, URL: globalThis.URL });
}
const good = '<h1 class="se-title-text">가상 제목</h1><div class="se-main-container">가상 본문</div>';
test('실제DOM파서에서본문과제목만읽음·본문밖댓글/광고제외', () => {
  const result = extract(good + '<aside>광고 문장</aside><section id="comment"><div class="u_cbox_text" contenteditable="true">댓글 입력</div></section>');
  assert.equal(result.ok, true); assert.equal(result.snapshot.body, '가상 본문'); assert.equal(result.snapshot.title, '가상 제목');
});
test('타블로그·목록·편집기·숨겨진본문·중복본문·큰본문은읽지않음', () => {
  for (const r of [extract(good, URL, 'other'), extract(good, 'https://blog.naver.com/my-blog'),
    extract(good.replace('class="se-title-text"', 'class="se-title-text" contenteditable="true"')), extract(good, URL, 'my-blog', true),
    extract(good + '<div class="se-main-container">두번째글</div>'),
    extract(`<h1 class="se-title-text">제목</h1><div class="se-main-container">${'가'.repeat(20001)}</div>`),
    extract('<div class="se-main-container">본문</div>')]) assert.equal(r.ok, false);
});
test('PostView형주소·구형본문영역확인', () => {
  const r = extract('<h1 class="htitle">구형 제목</h1><div id="postViewArea">구형 본문</div>', 'https://blog.naver.com/PostView.naver?blogId=my-blog&logNo=123');
  assert.equal(r.ok, true); assert.equal(r.snapshot.url, URL);
});
test('프레임결과는같은글하나만선택·다른본문혼합거절', () => {
  assert.deepEqual(chooseSnapshot([{ result: { ok: false } }, { result: { ok: true, snapshot } }], URL), snapshot);
  assert.throws(() => chooseSnapshot([{ result: { ok: true, snapshot } }, { result: { ok: true, snapshot: { ...snapshot, body: '다른내용' } } }], URL));
  assert.throws(() => chooseSnapshot([{ result: { ok: true, snapshot } }], 'https://blog.naver.com/other/123'));
});
test('확장패키지는최소권한·알람/자동실행/네이버상시권한없음', () => {
  const manifest = JSON.parse(readFileSync(new globalThis.URL('../extension/manifest.json', import.meta.url)));
  assert.deepEqual(manifest.permissions.sort(), ['activeTab', 'scripting', 'storage'].sort());
  assert.deepEqual(manifest.host_permissions, [`${SITE}/*`]); assert.equal(manifest.manifest_version, 3);
  for (const url of ['http://blog.naver.com/a/1', 'https://blog.naver.com.evil.test/a/1', 'javascript:alert(1)']) assert.equal(parsePost(url), null);
});
function setup({ tabUrl = URL, failOp, submitLost = false } = {}) {
  const local = { token: TOKEN }, session = {}, calls = [], levels = [];
  let executed = 0, completed = false;
  const storage = data => ({ setAccessLevel: async x => levels.push(x.accessLevel),
    get: async key => ({ [key]: data[key] }), set: async x => Object.assign(data, x), remove: async key => { delete data[key]; } });
  const browser = { storage: { local: storage(local), session: storage(session) }, runtime: { id: 'a'.repeat(32), getURL: path => `chrome-extension://${'a'.repeat(32)}/${path}` },
    tabs: { query: async () => [{ id: 7, url: tabUrl }], get: async () => ({ id: 7, url: tabUrl }) },
    scripting: { executeScript: async args => { executed++; assert.deepEqual(args.target, { tabId: 7, allFrames: true }); return [{ result: { ok: true, snapshot } }]; } } };
  const fetcher = async (url, init) => {
    if(url===`${SITE}/api/execution/extension`){const v=JSON.parse(init.body);calls.push({operation:v.operation,payload:v.payload});return Response.json({data:{phase:'idle'}});}
    assert.equal(url, `${SITE}/api/reader/extension`); assert.equal(init.credentials, 'omit'); assert.equal(init.redirect, 'error');
    const { operation, payload } = JSON.parse(init.body); calls.push({ operation, payload, token: init.headers.authorization });
    if (operation === failOp) throw new Error('offline');
    let data;
    if (operation === 'connect') return Response.json({ token: TOKEN, data: { deviceId: DEVICE, blogId: 'my-blog' } });
    if (operation === 'whoami') data = { deviceId: DEVICE, blogId: 'my-blog' };
    if (operation === 'prepare' || operation === 'status') data = { requestId: payload.request_id, state: completed ? 'completed' : 'pending' };
    if (operation === 'submit') { completed = true; if (submitLost) throw new Error('response_lost'); data = { state: 'completed' }; }
    return Response.json({ data });
  };
  const handle = createReaderController(browser, fetcher), sender = { id: browser.runtime.id, url: browser.runtime.getURL('popup.html') };
  return { run: m => handle(m, sender), handle, browser, local, session, calls, levels, executed: () => executed };
}
test('읽기는사용자확인후activeTab만·본문을영구저장하지않음', async () => {
  const s = setup(); const r = await s.run({ type: 'read', ownerConfirmed: true });
  assert.deepEqual(r.snapshot, snapshot); assert.equal(s.executed(), 1);
  assert.deepEqual(s.calls.map(x => x.operation), ['whoami', 'prepare']);
  assert.deepEqual(s.levels, ['TRUSTED_CONTEXTS', 'TRUSTED_CONTEXTS']);
  assert.doesNotMatch(JSON.stringify(s.session), /가상 본문|가상 제목/); assert.deepEqual(Object.keys(s.local), ['token']);
});
test('읽기확인안함/다른블로그/목록은본문주입이나전송없음', async () => {
  for (const [options, confirmed] of [[{}, false], [{ tabUrl: 'https://blog.naver.com/other/123' }, true], [{ tabUrl: 'https://blog.naver.com/my-blog' }, true]]) {
    const s = setup(options); await assert.rejects(s.run({ type: 'read', ownerConfirmed: confirmed }));
    assert.equal(s.executed(), 0); assert.ok(!s.calls.some(x => ['prepare', 'submit'].includes(x.operation)));
  }
});
test('페이지나사이트메시지로읽기/전송/토큰조회못함', async () => {
  const s = setup(), web = { id: s.browser.runtime.id, tab: { url: `${SITE}/reader` } };
  await assert.rejects(s.handle({ type: 'read', ownerConfirmed: true }, web));
  await assert.rejects(s.handle({ type: 'status' }, { id: 'other-extension', url: s.browser.runtime.getURL('popup.html') }));
  const status = await s.handle({ type: 'status' }, web); assert.doesNotMatch(JSON.stringify(status), new RegExp(TOKEN));
});
test('실행 연결은 확장 팝업 동의로만 시작하며 웹 메시지나 연결 상태 조회로 실행하지 않음',async()=>{
 const s=setup(),web={id:s.browser.runtime.id,tab:{url:`${SITE}/reader`}};
 for(const type of ['work_start','work_stop','work_status','context_preview','context_confirm','context_cancel'])await assert.rejects(s.handle({type,confirmed:true},web));
 await assert.rejects(s.run({type:'work_start'}));assert.equal((await s.run({type:'work_status'})).connected,false);
 assert.equal((await s.run({type:'work_stop'})).connected,false);assert.equal(s.executed(),0);assert.deepEqual(s.calls.map(x=>x.operation),['status']);
});
test('전송은사용자별도클릭·응답유실후자동재시도없이결과조회', async () => {
  const s = setup({ submitLost: true }), draft = await s.run({ type: 'read', ownerConfirmed: true });
  await assert.rejects(s.run({ type: 'submit', ...draft }), /response_lost/);
  assert.equal(s.calls.filter(x => x.operation === 'submit').length, 1);
  assert.equal((await s.run({ type: 'receipt' })).state, 'completed');
  assert.equal(s.calls.filter(x => x.operation === 'submit').length, 1);
});
test('같은pending을다시읽으면같은요청번호사용·완료됐으면본문재수집없음', async () => {
  const s = setup(), first = await s.run({ type: 'read', ownerConfirmed: true }), second = await s.run({ type: 'read', ownerConfirmed: true });
  assert.equal(first.requestId, second.requestId); await s.run({ type: 'submit', ...second });
  const count = s.executed(); const result = await s.run({ type: 'read', ownerConfirmed: true });
  assert.equal(result.receipt.state, 'completed'); assert.equal(s.executed(), count);
});
test('네트워크실패해제는로컬비밀삭제·서버해제불명표시', async () => {
  const s = setup({ failOp: 'disconnect' }); s.session.pending = { id: 'old' };
  const r = await s.run({ type: 'disconnect' }); assert.equal(r.remoteRevoked, false);
  assert.equal(s.local.token, undefined); assert.equal(s.session.pending, undefined);
});
test('읽는동안주소변경하면본문전송불가', async () => {
  const s = setup(); s.browser.tabs.get = async () => ({ url: 'https://blog.naver.com/my-blog/999' });
  await assert.rejects(s.run({ type: 'read', ownerConfirmed: true }), /주소가 바뀌/);
  assert.ok(!s.calls.some(x => x.operation === 'submit'));
});
