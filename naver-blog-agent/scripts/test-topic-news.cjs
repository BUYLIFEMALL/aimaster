// v2.16 후보(병합 A-2): 주제 최근 뉴스 근거(src/lib/topicNews.ts) + 근거 합치기 순서. 네트워크 없음.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { test } = require('node:test');
const load = (file, deps = {}) => {
  const m = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('require', 'module', 'exports', js)(n => deps[n] || require(n), m, m.exports);
  return m.exports;
};
const news = load('topicNews.ts');
const ground = load('ai/sourceGrounding.ts');
const ref = load('referenceUrls.ts', { './ai/sourceGrounding': ground });
const NOW = Date.parse('2026-10-23T12:00:00Z');
const item = (title, source, hoursAgo, link = 'https://news.google.com/rss/articles/x' + title.length) =>
  `<item><title>${title} - ${source}</title><link>${link}</link><pubDate>${new Date(NOW - hoursAgo * 3600e3).toUTCString()}</pubDate><source url="https://s.kr">${source}</source></item>`;
const feed = (items) => `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>${items.join('')}</channel></rss>`;

test('feed URL is a Korean Google News search', () => {
  assert.equal(news.topicNewsFeedUrl(' 캠핑 장비 '), 'https://news.google.com/rss/search?q=%EC%BA%A0%ED%95%91%20%EC%9E%A5%EB%B9%84&hl=ko&gl=KR&ceid=KR:ko');
});
test('only last 72 hours, newest first, source suffix removed, duplicates and non-https dropped, max 8', () => {
  const xml = feed([item('오래된 기사', '가신문', 100), item('어제 기사', '나일보', 20), item('방금 기사', '다뉴스', 1), item('방금 기사', '라뉴스', 2),
    item('주소 이상', '마뉴스', 3, 'http://bad.example/1'), ...Array.from({ length: 12 }, (_, i) => item('기사' + i + '번', '바방송', 5 + i))]);
  const r = news.parseTopicNews(xml, NOW);
  assert.equal(r.length, news.MAX_NEWS_ITEMS);
  assert.equal(r[0].title, '방금 기사'); assert.equal(r[0].source, '다뉴스');
  assert.ok(!r.some(x => x.title === '오래된 기사' || x.title === '주소 이상'));
  assert.equal(new Set(r.map(x => x.title)).size, r.length);
});
test('empty/invalid feed gives no items; material empty without items', () => {
  assert.deepEqual(news.parseTopicNews('<rss><channel></channel></rss>', NOW), []);
  assert.equal(news.parseTopicNews(feed([item('세액공제 서둘러야 - 머니투데이', '머니투데이', 1)]), NOW)[0].title, '세액공제 서둘러야');
  assert.equal(news.buildTopicNewsMaterial([]), '');
  const m = news.buildTopicNewsMaterial(news.parseTopicNews(feed([item('방금 기사', '다뉴스', 1)]), NOW));
  assert.match(m, /최근 72시간/); assert.match(m, /방금 기사 \(다뉴스, 2026\. 10\. 23\.\)/);
});
test('grounding order is source → reference URLs → news, and news is never cut', () => {
  const tail = news.buildTopicNewsMaterial(news.parseTopicNews(feed([item('방금 기사', '다뉴스', 1)]), NOW));
  const merged = ref.mergeReferenceMaterial('글감 요약', [{ url: 'https://a.com', text: '가'.repeat(6000) }], tail);
  assert.ok(merged.startsWith('글감 요약'));
  assert.ok(merged.indexOf('[참고 URL 1]') < merged.indexOf('[주제 최근 뉴스'));
  assert.ok(merged.endsWith(tail)); assert.ok(merged.length <= ground.MAX_SOURCE_CHARS);
  assert.equal(ref.mergeReferenceMaterial(undefined, [], tail), tail);
});
