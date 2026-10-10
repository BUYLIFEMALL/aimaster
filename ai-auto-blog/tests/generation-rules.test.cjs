const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mockRequire) {
  const source = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { module, exports: module.exports, require: mockRequire, console: { log() {}, error() {} }, Date, Intl, Math, Number, String, Array, Object, Set, Map, RegExp, JSON, Promise, Error });
  return module.exports;
}
const year = new Date().getFullYear();
const none = (name) => { throw Error(`Unexpected import ${name}`); };
const rules = load('utils/news/promptRules.ts', none);
const policy = load('utils/yearPolicy.ts', none);

test('target characters are clamped to 800..3500 in steps of 100 and default to 2000', () => {
  assert.equal(rules.resolveTargetChars(undefined), 2000);
  assert.equal(rules.resolveTargetChars('abc'), 2000);
  assert.equal(rules.resolveTargetChars(100), 800);
  assert.equal(rules.resolveTargetChars(99999), 3500);
  assert.equal(rules.resolveTargetChars(2040), 2000);
  assert.equal(rules.resolveTargetChars('2600'), 2600);
});

test('length rule uses characters only and never asks for words or 3.5x characters', () => {
  const { option, deepDive } = rules.buildLengthRules(2000);
  for (const text of [option, deepDive]) { assert.ok(!/단어/.test(text)); assert.ok(!/7,?000/.test(text)); }
  assert.ok(option.includes('2,000자')); assert.ok(option.includes('1,800') && option.includes('2,300'));
  assert.ok(deepDive.includes('500자'));
});

test('year rule names the current year, forbids regressing and keeps real past facts', () => {
  const rule = rules.buildYearRule(year);
  assert.ok(rule.includes(`${year}년`)); assert.ok(rule.includes('2023년') && rule.includes('2024년')); assert.ok(/과거 사실/.test(rule));
});

test('year policy: titles lose stale years, body keeps real past facts', () => {
  assert.equal(policy.sanitizeYear('2024년 청년 지원금 완벽 가이드', year), `${year}년 청년 지원금 완벽 가이드`);
  assert.equal(policy.sanitizeBodyYear('2024년 기준 신청 방법을 안내합니다.', year), `${year}년 기준 신청 방법을 안내합니다.`);
  assert.equal(policy.sanitizeBodyYear('이 제품은 2022년에 출시됐다.', year), '이 제품은 2022년에 출시됐다.');
});

// ---- 생성기 통합: 프롬프트와 결과에 규칙이 실제로 들어가는지 ----
function generator(modelJson) {
  const captured = {};
  const mocks = {
    './collector': {},
    '@/blog/utils/markdown': { mdLiteToHtml: (v) => v, estimateReadingMinutes: () => 3, extractExcerpt: (v) => v, formatReadableParagraphs: (v) => v },
    './imageGenerator': { generateSegmentImages: async () => [] },
    '@/blog/utils/ai/contentJson': { generateContentJson: async (request) => { captured.prompt = request.user; return modelJson; } },
    '@/blog/utils/ai/contentModels': { DEFAULT_CONTENT_PROVIDER: 'openai', DEFAULT_IMAGE_COUNT: 3, resolveContentModel: () => 'm', resolveImageCount: (n) => n },
    '@/blog/utils/yearPolicy': policy,
    './promptRules': rules,
  };
  const exports = load('utils/news/generator.ts', (name) => { if (name in mocks) return mocks[name]; return none(name); });
  return { exports, captured };
}
const news = { topic: 't', articles: [], topKeywords: [], signals: {}, summaryPromptContext: 'ctx' };
const sections = (n) => ({ ['제목']: `2024년 ${n} 완벽 가이드`, ['요약글']: '2024년 기준 요약입니다.', ['소제목 1']: '2023년 핵심', ['소제목 2']: 'b', ['소제목 3']: 'c', ['소제목 4']: 'd', ['문단 1']: '2024년 기준 신청 방법입니다.\n\n이 제품은 2021년에 출시됐다.', ['문단 2']: '가'.repeat(10), ['문단 3']: '나'.repeat(10), ['문단 4']: '다'.repeat(10) });

test('generator prompt carries the dynamic year rule and the character-based length rule', async () => {
  const { exports, captured } = generator(sections('x'));
  await exports.generateAutoPost(news, { topic: '2024년 청년 정책', targetChars: 3000, contentApiKey: 'k', storageUserId: 'u', imageCount: 1 });
  assert.ok(captured.prompt.includes(`현재 연도는 ${year}년`));
  assert.ok(captured.prompt.includes(`주제: ${year}년 청년 정책`), 'stale year in the topic is corrected before prompting');
  assert.ok(captured.prompt.includes('3,000자') && !/2,000자 이상/.test(captured.prompt) && !/단어/.test(captured.prompt));
});

test('generator corrects stale years in title, headings and current-info body text but keeps past facts', async () => {
  const { exports } = generator(sections('x'));
  const result = await exports.generateAutoPost(news, { topic: '주제', contentApiKey: 'k', storageUserId: 'u', imageCount: 1 });
  assert.ok(result.title.startsWith(`${year}년`));
  assert.ok(result.sections[0].heading.startsWith(`${year}년`));
  assert.ok(result.sections[0].body.includes(`${year}년 기준 신청`));
  assert.ok(result.sections[0].body.includes('2021년에 출시됐다'));
  assert.equal(typeof result.bodyChars, 'number'); assert.equal(result.targetChars, 2000);
});

test('legacy wordCount is read as characters and clamped', async () => {
  const { exports, captured } = generator(sections('x'));
  await exports.generateAutoPost(news, { topic: '주제', wordCount: 100000, contentApiKey: 'k', storageUserId: 'u', imageCount: 1 });
  assert.ok(captured.prompt.includes('3,500자'));
});
