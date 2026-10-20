// v1.95 홈판형 글 구성·간격 예약·쇼핑 커넥트 링크 검사(유료 호출 없음).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(rel) {
  const js = ts.transpileModule(fs.readFileSync(path.join(root, rel), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', js)(mod, mod.exports, require);
  return mod.exports;
}
const formats = load('src/lib/ai/articleFormats.ts');
const shop = load('src/lib/shoppingLinks.ts');
const slots = load('src/lib/scheduleSlots.ts');

test('글 구성: 기본형은 규칙을 붙이지 않고 홈판형만 4소제목·20~40자 제목 규칙을 붙인다', () => {
  assert.equal(formats.buildFormatResearchRule('standard'), '');
  assert.equal(formats.buildFormatWriterRule('standard'), '');
  assert.match(formats.buildFormatResearchRule('homefeed'), /정확히 4개/);
  assert.match(formats.buildFormatResearchRule('homefeed'), /20~40자/);
  assert.match(formats.buildFormatWriterRule('homefeed'), /질문으로 시작/);
  assert.equal(formats.isArticleFormat('homefeed'), true);
  assert.equal(formats.isArticleFormat('news'), false);
});

test('쇼핑 링크: 네이버 쇼핑 주소만 최대 5개, 중복 제거', () => {
  const { links, rejected } = shop.normalizeShoppingLinks('https://naver.me/a1\nhttps://naver.me/a1 https://smartstore.naver.com/x/products/1\nhttps://coupang.com/x http://naver.me/b');
  assert.deepEqual(links, ['https://naver.me/a1', 'https://smartstore.naver.com/x/products/1']);
  assert.deepEqual(rejected, ['https://coupang.com/x', 'http://naver.me/b']);
  const many = shop.normalizeShoppingLinks(Array.from({ length: 7 }, (_, i) => `https://naver.me/l${i}`));
  assert.equal(many.links.length, 5);
  assert.equal(shop.normalizeShoppingLinks('https://evilnaver.me/x').links.length, 0);
});

test('쇼핑 링크: 참고자료 앞까지 소제목마다 돌아가며 넣고 대가성 문구를 맨 앞에 한 번만 붙인다', () => {
  const content = ['[SECTION - 하나]', '본문1', '[SECTION - 둘]', '본문2', '[SECTION - 참고자료]', '출처'].join('\n');
  const out = shop.applyShoppingLinks(content, ['https://naver.me/a', 'https://naver.me/b', 'https://naver.me/c']);
  const lines = out.split('\n');
  assert.equal(lines[0], shop.SHOPPING_DISCLOSURE);
  const idx = (s) => lines.indexOf(s);
  assert.ok(idx('https://naver.me/a') > idx('본문1') && idx('https://naver.me/a') < idx('[SECTION - 둘]'));
  assert.ok(idx('https://naver.me/c') < idx('[SECTION - 둘]'));
  assert.ok(idx('https://naver.me/b') > idx('본문2') && idx('https://naver.me/b') < idx('[SECTION - 참고자료]'));
  assert.equal(shop.applyShoppingLinks(content, []), content);
  assert.equal(shop.ensureShoppingDisclosure(out), out);
  assert.equal(shop.ensureShoppingDisclosure('본문 https://naver.me/a').startsWith(shop.SHOPPING_DISCLOSURE), true);
  assert.equal(shop.ensureShoppingDisclosure('본문 https://example.com'), '본문 https://example.com');
});

test('간격 예약: 10분 단위 올림, 간격대로 배정, 너무 이른 시각은 거절', () => {
  const now = Date.parse('2026-10-20T03:00:00Z');
  const s = slots.buildScheduleSlots('2026-10-20T04:03:00Z', 60, 3, now);
  assert.deepEqual(s, ['2026-10-20T04:10:00.000Z', '2026-10-20T05:10:00.000Z', '2026-10-20T06:10:00.000Z']);
  assert.throws(() => slots.buildScheduleSlots('2026-10-20T03:05:00Z', 60, 1, now), /20분 이후/);
  assert.throws(() => slots.buildScheduleSlots('2026-10-20T04:00:00Z', 15, 1, now), /10분 단위/);
  assert.throws(() => slots.buildScheduleSlots('', 60, 1, now), /시작 시각/);
});

test('예약 저장 검사: 끄기는 시각 없이, 켜기는 미래 10분 단위만', () => {
  const now = Date.parse('2026-10-20T03:00:00Z');
  assert.equal(slots.validateReservation(undefined, undefined, now), null);
  assert.equal(slots.validateReservation(false, undefined, now), null);
  assert.match(slots.validateReservation(false, '2026-10-20T05:00:00Z', now), /비워/);
  assert.equal(slots.validateReservation(true, '2026-10-20T05:00:00.000Z', now), null);
  assert.match(slots.validateReservation(true, '2026-10-20T05:05:00Z', now), /10분 단위/);
  assert.match(slots.validateReservation(true, '2026-10-20T03:10:00Z', now), /20분 이후/);
  assert.match(slots.validateReservation('yes', null, now), /형식/);
});

const grounding = load('src/lib/ai/sourceGrounding.ts');
test('글감 근거: 자료가 없으면 아무 것도 붙이지 않고, 있으면 사실은 자료에서만 쓰라고 지시', () => {
  assert.equal(grounding.buildSourceBlock(''), '');
  assert.equal(grounding.buildSourceReviewRule(''), '');
  assert.match(grounding.buildSourceBlock('솔비가 결혼을 발표했다.'), /근거 자료[\s\S]*솔비가 결혼을 발표했다[\s\S]*지어내지 말고/);
  assert.equal(grounding.normalizeSourceMaterial('가'.repeat(5000)).length, grounding.MAX_SOURCE_CHARS);
  assert.equal(grounding.normalizeSourceMaterial(123), '');
});
test('원문 대조: 자료에 없는 문장이 있으면 PASS를 WARN으로 낮추고 문장을 의견에 표시', () => {
  const list = grounding.readUnsupported(['지인의 소개로 만났다.', '', 3, '짧']);
  assert.deepEqual(list, ['지인의 소개로 만났다.']);
  const r = grounding.applyUnsupported('PASS', list);
  assert.equal(r.status, 'WARN');
  assert.match(r.note, /근거 자료에 없는 사실 문장 1개[\s\S]*지인의 소개/);
  assert.deepEqual(grounding.applyUnsupported('PASS', []), { status: 'PASS', note: '' });
  assert.equal(grounding.applyUnsupported('FAIL', list).status, 'FAIL');
});
test('글감 원문 보관: 요약 + 원문을 합치고 4,000자 이내, 원문이 없으면 요약만 / 대조는 사실 주장만', () => {
  assert.equal(grounding.buildSourceMaterial('요약', ''), '요약');
  const merged = grounding.buildSourceMaterial('요약', '원문 기사 본문');
  assert.match(merged, /^요약\n\n\[원문 기사·자료\]\n원문 기사 본문$/);
  assert.equal(grounding.buildSourceMaterial('요약', '가'.repeat(9000)).length, grounding.MAX_SOURCE_CHARS);
  const rule = grounding.buildSourceReviewRule('자료');
  assert.match(rule, /사실 주장/);
  assert.match(rule, /것 같아요/);
});
test('글감별 원문: 여러 기사 중 글감과 가장 겹치는 기사 하나만 고른다', () => {
  const arts = [
    { title: '솔비, 이규한과 결혼 결심한 이유', text: '솔비가 예비 신랑 이규한에게 사과를 받았다', url: 'https://n.news.naver.com/article/1/1' },
    { title: '김수영 게장 판매 방송 차단 논란', text: '개그맨 김수영이 게장 원산지 질문을 차단했다', url: 'https://n.news.naver.com/article/2/2' },
  ];
  assert.equal(grounding.pickBestArticle('김수영 게장 방송 논란, 원산지 질문이 문제였나', arts).title, arts[1].title);
  assert.equal(grounding.pickBestArticle('전혀 관계없는 주제', arts), null);
  assert.match(grounding.articleSourceText(arts[1], 'fallback'), /^김수영 게장[\s\S]*출처: https:\/\/n\.news/);
  assert.equal(grounding.articleSourceText(null, '묶음 원문'), '묶음 원문');
});
