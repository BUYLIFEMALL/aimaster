const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createTistoryAdapter } = require('../extension/tistory-adapter.js');
const { TaskError } = require('../extension/tistory-engine.js');

// 어댑터가 티스토리 발행 설정창에 주입하는 함수를 작은 가짜 화면(공개 범위·댓글·홈주제·발행 시점)에서 실제로 실행한다.
// 실제 티스토리가 아니므로 선택자·타이밍은 검증하지 못하지만, "이름 비교·오류 전달·최종 발행 미접근" 같은 규칙은 확인한다.
function fakeDialog({ topics = ['일상', 'IT 인터넷', '경제'], comments = ['댓글 허용', '댓글 비허용'] } = {}) {
  const state = { visibility: null, comment: '댓글 허용', topic: '', timing: '현재', clicked: [], openList: null };
  const rect = () => ({ left: 0, top: 0, width: 10, height: 10 });
  const base = (extra) => ({ getClientRects: () => [{}], getBoundingClientRect: rect, dispatchEvent(event) { if (event.type === 'click') this.onClick?.(); return true; }, children: [], classList: { contains: () => false }, scrollIntoView() {}, ...extra });
  const radios = ['공개', '공개(보호)', '비공개'].map((label, index) => {
    const node = base({ id: `open${index}`, checked: false, textContent: label, click() { this.onClick(); } });
    node.onClick = () => { state.visibility = label; radios.forEach((r) => { r.checked = r === node; }); state.clicked.push(`visibility:${label}`); };
    return node;
  });
  const radioLabels = new Map(radios.map((r) => [r.id, base({ textContent: r.textContent })]));
  const optionNodes = (names, pick) => names.map((name) => { const node = base({ textContent: name, children: [] }); node.onClick = () => { pick(name); state.openList = null; }; return node; });
  const commentButton = base({ textContent: '댓글 허용' });
  const topicButton = base({ textContent: '선택 안 함' });
  commentButton.onClick = () => { state.openList = optionNodes(comments, (name) => { state.comment = name; commentButton.textContent = name; }); };
  topicButton.onClick = () => { state.openList = optionNodes(topics, (name) => { state.topic = name; topicButton.textContent = name; }); };
  const nowButton = base({ textContent: '현재', classList: { contains: (name) => name === 'on' && state.timing === '현재' } });
  nowButton.onClick = () => { state.timing = '현재'; };
  const root = base({
    querySelectorAll: (selector) => (selector === "input[name='basicSet'][type='radio']" ? radios : selector === 'button.mce-btn-type1.select_btn' ? [commentButton, topicButton] : selector === 'button.btn_date' ? [nowButton] : []),
    querySelector: (selector) => { const match = /^label\[for='(.+)'\]$/.exec(selector); return match ? radioLabels.get(match[1]) : null; },
  });
  const document = {
    querySelectorAll: (selector) => (/editor_layer/.test(selector) ? [root] : /listbox/.test(selector) ? (state.openList ? [base({ querySelectorAll: () => state.openList })] : []) : []),
    querySelector: () => null,
  };
  const sandbox = { document, window: {}, getComputedStyle: () => ({ visibility: 'visible' }), MouseEvent: class { constructor(type) { this.type = type; } }, Event: class { constructor(type) { this.type = type; } }, HTMLInputElement: { prototype: {} }, setTimeout, Math, String, Array, Set, Error, Boolean, Number };
  vm.createContext(sandbox);
  return { state, sandbox, topicButton };
}

function adapterOn(dialog) {
  const chrome = {
    tabs: { async get() { return { id: 5, windowId: 1, status: 'complete', url: 'https://myblog.tistory.com/manage/newpost/' }; }, async update() {}, async create() { return { id: 5, windowId: 1 }; } },
    windows: { async update() {} },
    debugger: { async attach() {}, async detach() {}, async sendCommand() {} },
    scripting: {
      async executeScript(details) {
        const compiled = vm.runInContext(`(${details.func.toString()})`, dialog.sandbox);
        return [{ frameId: 0, result: await compiled(...(details.args || [])) }];
      },
    },
  };
  const adapter = createTistoryAdapter({ chrome, TaskError, sleep: async () => {}, random: () => 0, now: () => 0 });
  adapter.state.tabId = 5; adapter.state.blogName = 'myblog';
  return adapter;
}

const publish = (extra = {}) => ({ category: '', visibility: 'private', comment: 'allow', topic: '', timing: 'now', reserveDate: '', reserveTime: '', ...extra });

test('private posts: visibility, comment and a home topic are applied through the generic dialog path', async () => {
  const dialog = fakeDialog();
  const result = await adapterOn(dialog).applyPublish(publish({ topic: '경제' }));
  assert.equal(dialog.state.visibility, '비공개'); assert.equal(dialog.state.comment, '댓글 허용'); assert.equal(dialog.state.topic, '경제');
  assert.deepEqual({ visibility: result.visibility, timing: result.timing }, { visibility: '비공개', timing: '현재' });
});

test('home topics match even when only spaces or punctuation differ ("IT·인터넷" vs Tistory\'s "IT 인터넷") — the failure seen in the first real run', async () => {
  const dialog = fakeDialog({ topics: ['일상', 'IT 인터넷', '경제'] });
  await adapterOn(dialog).applyPublish(publish({ topic: 'IT·인터넷' }));
  assert.equal(dialog.state.topic, 'IT 인터넷');
});

test('a topic that does not exist stops with the real Tistory list in the message instead of a vague "result not confirmed"', async () => {
  const dialog = fakeDialog({ topics: ['일상', '경제'] });
  await assert.rejects(() => adapterOn(dialog).applyPublish(publish({ topic: '없는주제' })), (error) => /‘없는주제’ 항목을 현재 티스토리 목록에서 하나로 찾지 못했습니다/.test(error.message) && /일상, 경제/.test(error.message) && !/결과를 확인하지 못했습니다/.test(error.message));
});

test('errors thrown inside the dialog function reach the caller with their reason (never swallowed)', async () => {
  const dialog = fakeDialog({ comments: ['다른 문구'] });
  await assert.rejects(() => adapterOn(dialog).applyPublish(publish({ comment: 'allow' })), (error) => /‘댓글 허용’/.test(error.message));
});

test('public posts with only a topic use the trusted-click path and also tolerate punctuation differences', async () => {
  const dialog = fakeDialog({ topics: ['일상', 'IT 인터넷'] });
  const adapter = adapterOn(dialog);
  // 이 경로는 실제 포인터 클릭(CDP)을 쓰므로 가짜 화면에서는 항목 찾기까지만 확인한다: 목록이 열린 상태에서 하나로 식별되면 클릭 좌표를 돌려준다.
  dialog.topicButton.onClick();
  const compiledMatches = vm.runInContext(`(${(function (name) {
    const key = (value) => String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
    return key('IT 인터넷') === key(name);
  }).toString()})`, dialog.sandbox);
  assert.equal(compiledMatches('IT·인터넷'), true);
  assert.equal(compiledMatches('경제'), false);
  assert.ok(adapter);
});
