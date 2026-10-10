const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// naver-page.js(네이버 편집기 화면 안에서 도는 명령)를 아주 작은 가짜 화면으로 시험한다. 실제 네이버·브라우저 없음.
// 가짜 화면은 "셀렉터 → 요소 목록"만 알려 주며, 이 시험은 팝업 판정처럼 요소 존재 여부로 결정되는 규칙만 다룬다.
function run(command, args, screen) {
  const el = (props = {}) => ({ getClientRects: () => [{}], matches: () => false, closest: () => null, querySelector: (selector) => (props.children || {})[selector] ?? null, className: props.className || '', textContent: props.text || '', ...props });
  const document = {
    querySelectorAll: (selector) => (screen[selector] || []).map((item) => (typeof item === 'function' ? item(el) : item)),
    body: { innerText: '' },
    activeElement: null,
  };
  const sandbox = { window: {}, document, getComputedStyle: () => ({ visibility: 'visible' }), location: { href: 'https://blog.naver.com/myblog/postwrite', hostname: 'blog.naver.com' }, URL, Promise, setTimeout, Math, String, Array, Object, Set, Boolean, console, module: undefined, MouseEvent: class {}, Node: { DOCUMENT_POSITION_FOLLOWING: 4 } };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', 'extension/naver-page.js'), 'utf8'), sandbox);
  return sandbox.blogEditorCommand(command, args);
}

test('an image-library side panel (role=dialog) is not treated as a blocking popup', async () => {
  // v1.44 실제 화면: 이미지 업로드 뒤 네이버가 오른쪽에 여는 "라이브러리" 패널 때문에 본문 입력이 중단됐다.
  const library = (el) => el({ className: 'library-panel', text: '라이브러리' });
  // 예전 판정 셀렉터(".se-popup-container,[role='dialog'][aria-modal='true']")로 찾으면 이 패널이 잡힌다 — 새 판정은 그 셀렉터를 쓰지 않는다.
  const screen = { ".se-popup-container,[role='dialog'][aria-modal='true']": [library], "[role='dialog'][aria-modal='true']": [library], '.se-popup-container': [] };
  const result = await run('focus', { kind: 'body' }, screen);
  assert.ok(!/팝업/.test(result.reason || ''), result.reason);
});

test('a real alert popup with a title still blocks typing and names itself', async () => {
  const popup = (el) => el({ children: { '.se-popup-title': { textContent: '작성 중인 글이 있습니다.' } } });
  popup.matches = () => false;
  const screen = { '.se-popup-container': [(el) => el({ querySelector: (selector) => (/se-popup-title/.test(selector) ? { textContent: '작성 중인 글이 있습니다.' } : null) })] };
  const result = await run('focus', { kind: 'body' }, screen);
  assert.equal(result.ok, false); assert.match(result.reason, /팝업이 열려 있습니다/); assert.match(result.reason, /작성 중인 글이 있습니다/);
});

test('a hidden or title-less .se-popup-container does not block', async () => {
  const hidden = (el) => el({ getClientRects: () => [], querySelector: () => ({ textContent: 'x' }) });
  const bare = (el) => el({ querySelector: () => null });
  const result = await run('focus', { kind: 'body' }, { '.se-popup-container': [hidden, bare] });
  assert.ok(!/팝업/.test(result.reason || ''), result.reason);
});

// ---- 본문 포커스 위치: 항상 문서의 맨 끝 문단 (v1.45 실제 시험에서 추천 링크가 본문 중간에 붙은 문제) ----
function focusRun(paragraphs) {
  const events = [];
  const range = { selectNodeContents() {}, collapse() {} };
  const selection = { removeAllRanges() {}, addRange() {} };
  const ownerDocument = { createRange: () => range, getSelection: () => selection };
  const make = (name, text) => ({
    name, innerText: text, textContent: text, isContentEditable: true, ownerDocument,
    getClientRects: () => [{}], getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 20 }),
    matches: () => false, closest: () => null, querySelector: () => null, scrollIntoView() {}, focus() {},
    dispatchEvent: (event) => { events.push([name, event.type]); return true; },
  });
  const list = paragraphs.map(([name, text]) => make(name, text));
  const document = {
    querySelectorAll: (selector) => (selector === '.se-text-paragraph' ? list : []),
    querySelector: () => null, body: { innerText: '' }, activeElement: null,
  };
  const sandbox = { window: {}, document, getComputedStyle: () => ({ visibility: 'visible' }), location: { href: 'https://blog.naver.com/myblog/postwrite', hostname: 'blog.naver.com' }, URL, Promise, setTimeout, Math, String, Array, Object, Set, Boolean, console, module: undefined, MouseEvent: class { constructor(type) { this.type = type; } }, Node: { DOCUMENT_POSITION_FOLLOWING: 4 } };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', 'extension/naver-page.js'), 'utf8'), sandbox);
  return sandbox.blogEditorCommand('focus', { kind: 'body' }).then((result) => ({ result, clicked: [...new Set(events.filter(([, type]) => type === 'mousedown').map(([name]) => name))] }));
}

test('body focus goes to the last paragraph even when blank lines exist in the middle of the text', async () => {
  const { result, clicked } = await focusRun([['p1', '첫 문단'], ['blank', ''], ['p2', '둘째 문단'], ['blank2', ''], ['last', '마지막 문단']]);
  assert.equal(result.ok, true, JSON.stringify(result)); assert.deepEqual(clicked, ["last"]);
});

test('body focus uses the new empty paragraph at the very end (after an image)', async () => {
  const { result, clicked } = await focusRun([['p1', '앞 문단'], ['blank', ''], ['newEmpty', '']]);
  assert.equal(result.ok, true); assert.deepEqual(clicked, ['newEmpty']);
});
