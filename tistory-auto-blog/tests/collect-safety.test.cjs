// 2026-10-22: 구글 뉴스 RSS 안전 해석·글 생성 AI 호출 시간 제한
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadTs(file, mockRequire) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function (exports, require, module) { ${output}\n})`)(module.exports, mockRequire, module);
  return module.exports;
}

const news = loadTs('utils/news/collector.ts', () => ({}));
const content = loadTs('utils/ai/contentJson.ts', () => ({ openAIGenerationParams: () => ({}) }));

const item = (extra) => `<item ${extra.attr ?? ''}><title><![CDATA[${extra.title}]]></title><link>${extra.link}</link><pubDate>${new Date().toUTCString()}</pubDate><description><![CDATA[첫 줄\n둘째 줄]]></description></item>`;

test('RSS: 속성 있는 item·여러 줄 CDATA·http(s) 링크만', () => {
  const xml = `<rss><channel>${item({ title: '정상 기사 - 한국일보', link: 'https://news.example.com/1' })}${item({ attr: 'rdf:about="x"', title: '속성 있는 항목', link: 'javascript:alert(1)' })}</channel></rss>`;
  const articles = news.parseRssXml(xml);
  assert.equal(articles.length, 2);
  assert.equal(articles[0].title, '정상 기사');
  assert.equal(articles[0].source, '한국일보');
  assert.equal(articles[0].link, 'https://news.example.com/1');
  assert.match(articles[0].snippet, /첫 줄/);
  assert.doesNotMatch(articles[0].snippet, /CDATA/);
  assert.equal(articles[1].link, '');
});

test('RSS: 항목은 최대 RSS_MAX_ITEMS개까지만 읽는다', () => {
  const many = Array.from({ length: 50 }, (_, i) => item({ title: `기사 ${i}`, link: `https://n.example.com/${i}` })).join('');
  assert.equal(news.parseRssXml(`<rss>${many}</rss>`).length, news.RSS_MAX_ITEMS);
});

test('글 생성 호출은 시간 제한이 넘으면 재시도 없이 한국어로 안내한다', async () => {
  assert.equal(content.CONTENT_TIMEOUT_MS, 150000);
  const original = global.fetch;
  let calls = 0;
  global.fetch = (_url, init) => { calls += 1; return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason))); };
  try {
    await assert.rejects(() => content.timedFetch('OpenAI', 'https://api.openai.com/v1/chat/completions', {}, 30), /OpenAI 글 생성이 0초 안에 끝나지 않았습니다/);
    assert.equal(calls, 1);
  } finally {
    global.fetch = original;
  }
});
