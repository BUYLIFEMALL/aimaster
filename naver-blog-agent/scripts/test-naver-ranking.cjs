// 네이버 랭킹 글감 수집 검사. 기본은 가짜 응답만 사용하고, LIVE=1이면 실제 네이버 주소를 1회씩 읽는다(무료).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const file = path.resolve(__dirname, '..', 'src', 'lib', 'naverRanking.ts');
const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', 'require', js)(mod, mod.exports, require);
const r = mod.exports;

const longBody = '<span class="end_photo_org"><img src="https://imgnews.pstatic.net/x.jpg"></span>본문 '.concat('가나다라마바사 '.repeat(30));
const fixtures = {
  'https://api-gw.entertain.naver.com/ranking/most-viewed': JSON.stringify({ result: { articles: [
    { officeId: '311', articleId: '0002070342', title: '연예 1위' },
    { officeId: 'x', articleId: '1', title: '잘못된 식별자' },
    { officeId: '111', articleId: '0000000002', title: '연예 2위' },
  ] } }),
  'https://api-gw.entertain.naver.com/news/article/311/0002070342': JSON.stringify({ result: { articleInfo: { article: { title: '연예 1위 기사', content: longBody } } } }),
  'https://api-gw.entertain.naver.com/news/article/111/0000000002': JSON.stringify({ result: { articleInfo: { article: { title: '짧은 기사', content: '짧음' } } } }),
  'https://api-gw.sports.naver.com/news/articles/popular': JSON.stringify({ result: { newsList: [{ oid: '144', aid: '0001145203', title: '스포츠 1위' }] } }),
  'https://api-gw.sports.naver.com/news/article/144/0001145203': JSON.stringify({ result: { articleInfo: { article: { title: '스포츠 기사', content: longBody } } } }),
  'https://news.naver.com/main/list.naver?mode=LSD&mid=sec&sid1=101': '<a href="https://n.news.naver.com/mnews/article/021/0002826420">a</a><a href="https://n.news.naver.com/mnews/article/021/0002826420?sid=101">dup</a>',
  'https://n.news.naver.com/mnews/article/021/0002826420': `<meta property="og:title" content="경제 기사 &amp; 제목"><article id="dic_area" class="go_trans">${longBody}</article>`,
};
const fake = async (url) => { if (!(url in fixtures)) throw new Error('없음 ' + url); return fixtures[url]; };

test('연예 랭킹: 잘못된 식별자·짧은 본문은 빼고 이미지 태그 없이 본문만 가져온다', async () => {
  const list = await r.fetchRankingArticles('entertainment', 5, fake);
  assert.equal(list.length, 1);
  assert.equal(list[0].title, '연예 1위 기사');
  assert.equal(list[0].url, 'https://n.news.naver.com/article/311/0002070342');
  assert.ok(!/<img|pstatic/.test(list[0].text));
});

test('스포츠·경제 랭킹을 읽고 경제 중복 주소는 한 번만 쓴다', async () => {
  assert.equal((await r.fetchRankingArticles('sports', 5, fake))[0].title, '스포츠 기사');
  const econ = await r.fetchRankingArticles('economy', 5, fake);
  assert.equal(econ.length, 1);
  assert.equal(econ[0].title, '경제 기사 & 제목');
});

test('형식이 바뀌면 안내 오류를 낸다', async () => {
  assert.throws(() => r.parseRankingList('sports', { result: {} }), /형식이 바뀌어/);
  await assert.rejects(r.fetchRankingArticles('entertainment', 5, async (u) => u.includes('ranking') ? JSON.stringify({ result: { articles: [] } }) : ''), /불러오지 못했습니다/);
  assert.equal(r.isRankingKind('economy'), true);
  assert.equal(r.isRankingKind('politics'), false);
});

if (process.env.LIVE === '1') {
  for (const kind of ['entertainment', 'sports', 'economy']) {
    test(`실제 네이버 ${kind} 랭킹`, async () => {
      const list = await r.fetchRankingArticles(kind, 3);
      assert.ok(list.length >= 1);
      for (const a of list) assert.ok(a.text.length >= 100, a.title);
      console.log(kind, list.map(a => `${a.title} (${a.text.length}자)`).join(' / '));
    });
  }
}
