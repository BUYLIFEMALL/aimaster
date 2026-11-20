// 2026-11-20 (Master msg_00f267650a0d): AI 응답 형식 검사 — 필수 칸이 빠졌거나 글자가 아니면 저장 전에 거절.
// 외부 호출 0: AI·이미지 함수는 가짜로 바꾸고 고정 응답만 넣는다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadTs(file, requireMap = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function (exports, require, module) { ${output}\n})`)(module.exports, (name) => requireMap[name] || {}, module);
  return module.exports;
}

const headingDedupe = loadTs('utils/news/headingDedupe.ts');
const lengthPlan = loadTs('utils/news/lengthPlan.ts');

function loadGenerator(aiResponse) {
  const calls = { ai: 0, images: 0 };
  const same = (value) => value;
  const gen = loadTs('utils/news/generator.ts', {
    './collector': {},
    '@/blog/utils/markdown': { mdLiteToHtml: same, estimateReadingMinutes: () => 1, extractExcerpt: same, formatReadableParagraphs: same },
    './imageGenerator': { generateSegmentImages: async () => { calls.images += 1; return []; } },
    '@/blog/utils/ai/contentJson': { generateContentJson: async () => { calls.ai += 1; return aiResponse; } },
    '@/blog/utils/ai/contentModels': { DEFAULT_CONTENT_PROVIDER: 'openai', DEFAULT_IMAGE_COUNT: 0, resolveContentModel: () => 'test-model', resolveImageCount: (n) => n },
    '@/blog/utils/duplicateTitle': { removeDuplicateTitleLines: same },
    '@/blog/utils/yearPolicy': { sanitizeBodyYear: same, sanitizeYear: same },
    '@/blog/utils/postSource': { sourceMaterialRule: () => '' },
    './headingDedupe': headingDedupe,
    './lengthPlan': lengthPlan,
  });
  return { gen, calls };
}

const NEWS = { topKeywords: ['키워드'], articles: [] };
const OPTIONS = (over = {}) => ({ topic: '시험 주제', contentApiKey: 'test-key', imageCount: 0, ...over });

const valid = () => ({
  제목: '정상 제목',
  요약글: '정상 요약입니다.',
  '소제목 1': '첫째 소제목', '소제목 2': '둘째 소제목', '소제목 3': '셋째 소제목', '소제목 4': '넷째 소제목',
  '문단 1': '첫째 문단 본문', '문단 2': '둘째 문단 본문', '문단 3': '셋째 문단 본문', '문단 4': '넷째 문단 본문',
});

test('정상 응답은 그대로 글이 된다(기존 동작 보존)', async () => {
  const { gen, calls } = loadGenerator(valid());
  const post = await gen.generateAutoPost(NEWS, OPTIONS());
  assert.equal(post.title, '정상 제목');
  assert.equal(post.excerpt, '정상 요약입니다.');
  for (const text of ['## 첫째 소제목', '## 넷째 소제목', '첫째 문단 본문', '넷째 문단 본문']) assert.ok(post.contentMarkdown.includes(text), text);
  assert.ok(!post.contentMarkdown.includes('완벽 가이드'), '기본 문구로 채우지 않음');
  assert.equal(calls.ai, 1);
  assert.equal(gen.generateSeoPost, gen.generateAutoPost, '다른 진입 이름도 같은 함수');
});

test('예전 문단 별칭(「1문단」)도 받는다', async () => {
  const response = valid();
  delete response['문단 3'];
  response['3문단'] = '별칭 셋째 문단';
  const { gen } = loadGenerator(response);
  const post = await gen.generateAutoPost(NEWS, OPTIONS());
  assert.ok(post.contentMarkdown.includes('별칭 셋째 문단'));
});

test('필수 칸이 빠지면 저장 전에 거절하고 이미지도 만들지 않는다', async () => {
  const response = valid();
  delete response['문단 3'];
  const { gen, calls } = loadGenerator(response);
  await assert.rejects(gen.generateAutoPost(NEWS, OPTIONS({ imageCount: 2 })), (error) => {
    assert.match(error.message, /AI 응답 형식이 올바르지 않아 글을 저장하지 않았습니다/);
    assert.match(error.message, /문단 3\(비어 있음\)/);
    return true;
  });
  assert.equal(calls.images, 0, '이미지 비용 0');
});

test('글자가 아닌 값·빈 글자는 거절한다', async () => {
  const cases = [
    [{ 제목: 123 }, /제목\(글자 아님\)/],
    [{ '소제목 2': ['배열'] }, /소제목 2\(글자 아님\)/],
    [{ 요약글: '   ' }, /요약글\(비어 있음\)/],
    [{ '문단 1': { text: '객체' } }, /문단 1\(글자 아님\)/],
  ];
  for (const [patch, pattern] of cases) {
    const { gen } = loadGenerator({ ...valid(), ...patch });
    await assert.rejects(gen.generateAutoPost(NEWS, OPTIONS()), pattern);
  }
});

test('응답 전체가 객체가 아니면 거절한다', async () => {
  for (const response of [null, 'text', [], 7]) {
    const { gen } = loadGenerator(response);
    await assert.rejects(gen.generateAutoPost(NEWS, OPTIONS()), /응답 전체\(JSON 객체 아님\)/);
  }
});

test('validatePostJson은 문제 칸을 모두 알려 준다', () => {
  const { gen } = loadGenerator(valid());
  assert.deepEqual(gen.validatePostJson(valid()).ok, true);
  const result = gen.validatePostJson({ 제목: '제목만' });
  assert.equal(result.ok, false);
  assert.equal(result.problems.length, 9);
});
