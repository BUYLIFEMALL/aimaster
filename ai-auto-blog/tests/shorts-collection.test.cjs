const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// 유튜브 쇼츠 떡상 분석(v1.66)의 검색·분석·저장 API를 실제 코드로 시험한다. 실제 YouTube·AI·DB 호출 없음(가짜 fetch·가짜 DB).
function loadTs(file, mockRequire) {
  const source = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function (exports, require, module) { ${output}\n})`)(module.exports, mockRequire, module);
  return module.exports;
}

const baseRequire = (name) => {
  if (name === 'server-only') return {};
  if (name.endsWith('/ai/collector')) return {};
  if (name.endsWith('/ai/youtubeShorts')) return youtube;
  throw Error(`Unexpected import: ${name}`);
};
const youtube = loadTs('utils/ai/youtubeShorts.ts', baseRequire);
const analysisModule = loadTs('utils/ai/shortsAnalysis.ts', baseRequire);

// ---- fetch 가짜 ----
const realFetch = globalThis.fetch;
const calls = [];
function fakeFetch(handler) {
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    calls.push({ url, init });
    return handler(url, init);
  };
}
const ok = (body) => ({ ok: true, status: 200, json: async () => body });
const fail = (status, body) => ({ ok: false, status, json: async () => body });
test.afterEach(() => { globalThis.fetch = realFetch; calls.length = 0; });

const rawVideo = (id, extra = {}) => ({ id, snippet: { title: `영상 ${id}`, channelId: `ch-${id}`, channelTitle: `채널 ${id}`, publishedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), thumbnails: { medium: { url: 'https://img/x.jpg' } } }, statistics: { viewCount: '100000', likeCount: '5000', commentCount: '500' }, contentDetails: { duration: 'PT45S' }, ...extra });
const rawChannel = (id, extra = {}) => ({ id, statistics: { subscriberCount: '10000', viewCount: '500000', videoCount: '50', hiddenSubscriberCount: false, ...extra } });

// ---------- 지표 ----------
test('grades follow views ÷ subscribers (10x super hit, 5x hit, 3x viral, 1x ok) and hidden subscribers are not judged', () => {
  assert.equal(youtube.gradeOf(12), '초대박'); assert.equal(youtube.gradeOf(5), '대박'); assert.equal(youtube.gradeOf(3), '떡상'); assert.equal(youtube.gradeOf(1), '양호'); assert.equal(youtube.gradeOf(0.4), '보통'); assert.equal(youtube.gradeOf(null), '판정불가');
  assert.equal(youtube.parseDuration('PT1M5S'), 65); assert.equal(youtube.parseDuration('PT45S'), 45); assert.equal(youtube.parseDuration('PT1H2M3S'), 3723); assert.equal(youtube.parseDuration(undefined), 0);
});

test('metrics come only from the real numbers YouTube returned; hidden or zero subscribers give no ratio', () => {
  const now = new Date();
  const hit = youtube.buildShortVideo(rawVideo('a'), rawChannel('ch-a'), now);
  assert.equal(hit.views, 100000); assert.equal(hit.subs, 10000); assert.equal(hit.vsRatio, 10); assert.equal(hit.grade, '초대박'); assert.equal(hit.durationSec, 45);
  assert.ok(hit.viralScore > 0 && hit.viralScore <= 100);
  const hidden = youtube.buildShortVideo(rawVideo('b'), rawChannel('ch-b', { hiddenSubscriberCount: true }), now);
  assert.equal(hidden.subs, null); assert.equal(hidden.vsRatio, null); assert.equal(hidden.grade, '판정불가');
  assert.equal(youtube.buildShortVideo(rawVideo('c'), undefined, now).subs, null);
  assert.equal(youtube.buildShortVideo(rawVideo('d'), rawChannel('ch-d', { subscriberCount: '0' }), now).vsRatio, null);
});

// ---------- 검색 ----------
test('search calls search → videos → channels once each with the member\'s key and Korean shorts filters; empty results stop early', async () => {
  fakeFetch((url) => {
    if (url.includes('/search?')) return ok({ items: [{ id: { videoId: 'aaaaaaaaaaa' } }, { id: { videoId: 'bbbbbbbbbbb' } }, { id: {} }] });
    if (url.includes('/videos?')) return ok({ items: [rawVideo('aaaaaaaaaaa'), rawVideo('bbbbbbbbbbb')] });
    if (url.includes('/channels?')) return ok({ items: [rawChannel('ch-aaaaaaaaaaa'), rawChannel('ch-bbbbbbbbbbb')] });
    throw Error(`unexpected ${url}`);
  });
  const videos = await youtube.searchYoutubeShorts({ query: '다이어트', dateFrom: '2026-09-10', dateTo: '2026-10-10', order: 'viewCount' }, 'MEMBER_KEY');
  assert.equal(videos.length, 2); assert.equal(calls.length, 3);
  const searchUrl = new URL(calls[0].url);
  assert.equal(searchUrl.searchParams.get('key'), 'MEMBER_KEY'); assert.equal(searchUrl.searchParams.get('q'), '다이어트'); assert.equal(searchUrl.searchParams.get('videoDuration'), 'short'); assert.equal(searchUrl.searchParams.get('regionCode'), 'KR'); assert.equal(searchUrl.searchParams.get('order'), 'viewCount');
  assert.equal(searchUrl.searchParams.get('publishedAfter'), '2026-09-10T00:00:00.000Z'); assert.equal(searchUrl.searchParams.get('publishedBefore'), '2026-10-10T23:59:59.000Z');
  assert.equal(new URL(calls[1].url).searchParams.get('id'), 'aaaaaaaaaaa,bbbbbbbbbbb');
  calls.length = 0;
  fakeFetch(() => ok({ items: [] }));
  assert.deepEqual(await youtube.searchYoutubeShorts({ query: '없음', order: 'viewCount' }, 'K'), []); assert.equal(calls.length, 1, 'no videos/channels calls when nothing was found');
});

test('YouTube errors become clear Korean messages (quota, API not enabled, invalid key) and never echo the key', async () => {
  const cases = [
    [fail(403, { error: { message: 'quota', errors: [{ reason: 'quotaExceeded' }] } }), /일일 할당량/, false],
    [fail(403, { error: { message: 'x', errors: [{ reason: 'accessNotConfigured' }] } }), /활성화되어 있지 않습니다/, true],
    [fail(400, { error: { message: 'API key not valid. Please pass a valid API key.', errors: [{ reason: 'badRequest' }] } }), /키가 올바르지 않습니다/, true],
    [fail(500, { error: { message: 'boom SECRET_KEY_ECHO' } }), /검색에 실패했습니다\. \(500\)/, false],
  ];
  for (const [response, pattern, invalidKey] of cases) {
    fakeFetch(() => response);
    await assert.rejects(() => youtube.searchYoutubeShorts({ query: 'q', order: 'viewCount' }, 'SECRET_KEY_ECHO'), (error) => error instanceof youtube.YouTubeSearchError && pattern.test(error.message) && error.invalidKey === invalidKey && !error.message.includes('SECRET_KEY_ECHO'));
  }
});

test('context (description and top comments) degrades to empty instead of failing the analysis', async () => {
  fakeFetch((url) => { if (url.includes('commentThreads')) return fail(403, { error: { errors: [{ reason: 'commentsDisabled' }] } }); return ok({ items: [{ snippet: { description: '설명입니다' } }] }); });
  assert.deepEqual(await youtube.fetchShortContext('aaaaaaaaaaa', 'K'), { description: '설명입니다', comments: [] });
});

// ---------- 분석 ----------
const META = { id: 'aaaaaaaaaaa', title: '쇼츠 제목', channelName: '채널', views: 100000, subs: 10000, vsRatio: 10, grade: '초대박', publishedAt: '2026-10-01T00:00:00Z' };
const GOOD = JSON.stringify({ hook: '첫 장면 훅', whyViral: '공감 소재', candidates: [{ title: '제목 하나', summary: '요약 하나', keywords: ['#키워드1', '키워드2'] }, { title: '제목 둘', content: '본문 요약(content 키)', keywords: [] }, { title: '', summary: '제목 없음' }] });

test('analysis prompts carry the current year, the anti-copy rule and the injection guard; metadata mode never claims to have seen the video', () => {
  const year = new Date().getFullYear();
  const video = analysisModule.buildShortsSystemPrompt('video', 3);
  const metadata = analysisModule.buildShortsSystemPrompt('metadata', 3);
  assert.ok(video.includes(`${year}년`) && video.includes('그대로 옮기지 말고') && video.includes('<data>'));
  assert.ok(metadata.includes('영상 파일은 볼 수 없습니다') && !metadata.includes('첨부된 영상을 실제로 보고'));
  assert.ok(analysisModule.buildShortsUserPrompt(META, { description: '설명', comments: ['댓글1'] }).includes('https://www.youtube.com/shorts/aaaaaaaaaaa'));
});

test('parseShortAnalysis cleans code fences, drops empty candidates, strips # from keywords and limits the count', () => {
  const parsed = analysisModule.parseShortAnalysis('```json\n' + GOOD + '\n```', 3);
  assert.equal(parsed.hook, '첫 장면 훅'); assert.equal(parsed.candidates.length, 2);
  assert.deepEqual(parsed.candidates[0].keywords, ['키워드1', '키워드2']); assert.equal(parsed.candidates[1].summary, '본문 요약(content 키)');
  assert.equal(analysisModule.parseShortAnalysis(GOOD, 1).candidates.length, 1);
  assert.throws(() => analysisModule.parseShortAnalysis('not json', 3), /해석하지 못했습니다/);
  assert.throws(() => analysisModule.parseShortAnalysis(JSON.stringify({ candidates: [] }), 3), /생성된 주제 후보가 없습니다/);
});

const geminiOk = () => ok({ candidates: [{ content: { parts: [{ text: GOOD }] } }] });
const openaiOk = () => ok({ choices: [{ message: { content: GOOD } }] });

test('with a Gemini key the video itself is analysed (watch URL sent as fileData, key in the header, not the URL)', async () => {
  fakeFetch((url) => { if (url.includes('generativelanguage')) return geminiOk(); throw Error('only gemini expected'); });
  const result = await analysisModule.analyzeShortForBlog({ meta: META, extra: { description: '', comments: [] }, geminiKey: 'GEM', openaiKey: null });
  assert.equal(result.evidence, 'video'); assert.equal(result.note, undefined);
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.contents[0].parts[0].fileData.fileUri, 'https://www.youtube.com/watch?v=aaaaaaaaaaa');
  assert.equal(calls[0].init.headers['x-goog-api-key'], 'GEM'); assert.ok(!calls[0].url.includes('GEM'));
});

test('without Gemini, or when Gemini fails, OpenAI makes a metadata-based estimate and says so; with neither key it refuses', async () => {
  fakeFetch((url) => { if (url.includes('openai')) return openaiOk(); throw Error('only openai expected'); });
  const noGemini = await analysisModule.analyzeShortForBlog({ meta: META, extra: { description: '', comments: [] }, geminiKey: null, openaiKey: 'OAI' });
  assert.equal(noGemini.evidence, 'metadata'); assert.match(noGemini.note, /Gemini 키가 없어/);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer OAI');
  calls.length = 0;
  fakeFetch((url) => (url.includes('generativelanguage') ? fail(500, { error: { message: '모델 오류' } }) : openaiOk()));
  const fallback = await analysisModule.analyzeShortForBlog({ meta: META, extra: { description: '', comments: [] }, geminiKey: 'GEM', openaiKey: 'OAI' });
  assert.equal(fallback.evidence, 'metadata'); assert.match(fallback.note, /직접 분석하지 못해/);
  await assert.rejects(() => analysisModule.analyzeShortForBlog({ meta: META, extra: { description: '', comments: [] }, geminiKey: 'GEM', openaiKey: null }), /Gemini 요청 실패/);
  await assert.rejects(() => analysisModule.analyzeShortForBlog({ meta: META, extra: { description: '', comments: [] }, geminiKey: null, openaiKey: null }), /Gemini 또는 OpenAI API 키가 필요/);
});

// ---------- API 경로 ----------
function routeHarness({ access = { allowed: true, user: { id: 'member-a' } }, keys = { youtube_api_key: 'YT', gemini: 'GEM', openai: 'OAI' }, categories = [{ id: 7 }], candidates = [], insertError = null, analyze = null } = {}) {
  const rows = { blog_candidates: candidates.map((row) => ({ ...row })), blog_categories: categories, user_api_keys: Object.entries(keys).map(([provider, api_key]) => ({ user_id: 'member-a', provider, api_key })) };
  const stats = { reads: 0, inserts: [], aiCalls: 0 };
  const client = { from(table) {
    const filters = []; let limitN = null;
    const q = {
      select() { return q; }, eq(k, v) { filters.push((row) => row[k] === v); return q; }, limit(n) { limitN = n; return q; },
      maybeSingle: async () => { stats.reads += 1; return { data: rows[table].find((row) => filters.every((f) => f(row))) ?? null, error: null }; },
      insert: async (values) => { if (insertError) return { error: { message: 'SECRET_DB_DETAIL' } }; stats.inserts.push(...values); rows[table].push(...values); return { error: null }; },
      then(resolve) { stats.reads += 1; const data = rows[table].filter((row) => filters.every((f) => f(row))); resolve({ data: limitN ? data.slice(0, limitN) : data, error: null }); },
    };
    return q;
  } };
  const mockRequire = (name) => {
    if (name === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } };
    if (name.endsWith('/supabase/admin')) return { createAdminClient: () => client };
    if (name.endsWith('/utils/access')) return { checkProgramAccessApi: async () => access };
    if (name.endsWith('/utils/apiKeys')) return { resolveApiKey: async (_c, userId, provider) => rows.user_api_keys.find((row) => row.user_id === userId && row.provider === provider)?.api_key ?? null };
    if (name.endsWith('/ai/youtubeShorts')) return youtube;
    if (name.endsWith('/ai/shortsAnalysis')) return { analyzeShortForBlog: async (params) => { stats.aiCalls += 1; stats.aiParams = params; if (analyze) return analyze(params); return { evidence: 'video', hook: '훅', whyViral: '이유', candidates: [{ title: '주제 1', summary: '요약 1', keywords: ['a'] }, { title: '주제 2', summary: '요약 2', keywords: [] }] }; } };
    throw Error(`Unexpected import: ${name}`);
  };
  return { handlers: loadTs('app/api/candidates/shorts/route.ts', mockRequire), rows, stats };
}
const post = (body) => new Request('https://test.invalid/api/candidates/shorts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const VIDEO = { id: 'aaaaaaaaaaa', title: '쇼츠', channelName: '채널', views: 100000, subs: 10000, vsRatio: 10, grade: '초대박', publishedAt: '2026-10-01T00:00:00Z' };

test('no access: nothing is read, searched, analysed or saved', async () => {
  const h = routeHarness({ access: { allowed: false, status: 403, error: 'Denied' } });
  assert.equal((await h.handlers.GET()).status, 403);
  assert.equal((await h.handlers.POST(post({ action: 'search', query: 'q' }))).status, 403);
  assert.equal((await h.handlers.POST(post({ action: 'analyze', video: VIDEO }))).status, 403);
  assert.equal(h.stats.reads, 0); assert.equal(h.stats.aiCalls, 0); assert.equal(h.stats.inserts.length, 0);
});

test('GET only tells which keys exist and never returns a key value', async () => {
  const h = routeHarness({ keys: { youtube_api_key: 'YT_SECRET', openai: 'OAI_SECRET' } });
  const text = await (await h.handlers.GET()).text();
  assert.deepEqual(JSON.parse(text), { hasYoutubeKey: true, hasGeminiKey: false, hasOpenaiKey: true });
  assert.ok(!text.includes('SECRET'));
});

test('search: needs a query and the member\'s own YouTube key (no other key is ever used); options are validated', async () => {
  const h = routeHarness({ keys: {} });
  assert.equal((await h.handlers.POST(post({ action: 'search', query: '  ' }))).status, 400);
  const noKey = await h.handlers.POST(post({ action: 'search', query: '다이어트' }));
  assert.equal(noKey.status, 400); assert.equal((await noKey.json()).needKey, true);
  const withKey = routeHarness({ keys: { youtube_api_key: 'MEMBER_YT', gemini: 'G', openai: 'O' } });
  fakeFetch(() => ok({ items: [] }));
  const result = await withKey.handlers.POST(post({ action: 'search', query: '다이어트', dateFrom: 'bad', order: 'weird' }));
  assert.equal(result.status, 200); assert.deepEqual((await result.json()).videos, []);
  const url = new URL(calls[0].url);
  assert.equal(url.searchParams.get('key'), 'MEMBER_YT'); assert.equal(url.searchParams.get('order'), 'viewCount', 'unknown sort falls back'); assert.equal(url.searchParams.get('publishedAfter'), null, 'a malformed date is ignored');
});

test('search: YouTube errors reach the member as clear messages; invalid keys ask to re-register', async () => {
  const h = routeHarness();
  fakeFetch(() => fail(403, { error: { message: 'x', errors: [{ reason: 'accessNotConfigured' }] } }));
  const response = await h.handlers.POST(post({ action: 'search', query: 'q' }));
  const body = await response.json();
  assert.equal(response.status, 400); assert.match(body.error, /활성화되어 있지 않습니다/); assert.equal(body.needKey, true);
});

test('analyze: saves 1-3 topic candidates as source_type http + the shorts URL, with the analysis line, keywords and the chosen category — and only for the member', async () => {
  const h = routeHarness();
  fakeFetch((url) => (url.includes('commentThreads') ? ok({ items: [] }) : ok({ items: [{ snippet: { description: '설명' } }] })));
  const response = await h.handlers.POST(post({ action: 'analyze', video: VIDEO, categoryId: 7 }));
  const body = await response.json();
  assert.equal(response.status, 200); assert.equal(body.count, 2); assert.equal(body.evidence, 'video');
  assert.equal(h.stats.inserts.length, 2);
  for (const row of h.stats.inserts) {
    assert.equal(row.user_id, 'member-a'); assert.equal(row.source_type, 'http'); assert.equal(row.source_input, 'https://www.youtube.com/shorts/aaaaaaaaaaa'); assert.equal(row.category_id, 7);
    assert.match(row.summary, /^\[영상 분석\] 훅: 훅 \/ 터진 이유: 이유\n\n요약/);
  }
  assert.equal(h.stats.aiParams.geminiKey, 'GEM'); assert.equal(h.stats.aiParams.openaiKey, 'OAI'); assert.deepEqual(h.stats.aiParams.extra, { description: '설명', comments: [] });
});

test('analyze: bad video ids, unknown categories and duplicates are refused BEFORE any AI call', async () => {
  for (const id of ['short', '../etc/passwd', 'aaaaaaaaaa!', '', 5]) {
    const h = routeHarness();
    assert.equal((await h.handlers.POST(post({ action: 'analyze', video: { ...VIDEO, id } }))).status, 400);
    assert.equal(h.stats.aiCalls, 0);
  }
  // BLOG의 카테고리는 회원별이 아니라 공통 분류 목록이라 "존재하는 카테고리인지"만 확인한다.
  const unknown = routeHarness({ categories: [{ id: 99 }] });
  assert.equal((await unknown.handlers.POST(post({ action: 'analyze', video: VIDEO, categoryId: 7 }))).status, 400); assert.equal(unknown.stats.aiCalls, 0);
  assert.equal((await routeHarness().handlers.POST(post({ action: 'analyze', video: VIDEO, categoryId: 'abc' }))).status, 400);
  const dup = routeHarness({ candidates: [{ id: 'x', user_id: 'member-a', source_input: 'https://www.youtube.com/shorts/aaaaaaaaaaa' }] });
  const response = await dup.handlers.POST(post({ action: 'analyze', video: VIDEO }));
  assert.equal(response.status, 409); assert.equal((await response.json()).duplicate, true); assert.equal(dup.stats.aiCalls, 0, 'no repeat cost');
  const otherMember = routeHarness({ candidates: [{ id: 'x', user_id: 'member-b', source_input: 'https://www.youtube.com/shorts/aaaaaaaaaaa' }] });
  assert.equal((await otherMember.handlers.POST(post({ action: 'analyze', video: VIDEO }))).status, 200, 'another member\'s saved video does not block this member');
});

test('analyze: without a Gemini or OpenAI key of the member nothing runs; a YouTube key is optional', async () => {
  const none = routeHarness({ keys: { youtube_api_key: 'YT' } });
  const response = await none.handlers.POST(post({ action: 'analyze', video: VIDEO }));
  assert.equal(response.status, 400); assert.equal((await response.json()).needKey, true); assert.equal(none.stats.aiCalls, 0);
  const noYoutube = routeHarness({ keys: { openai: 'OAI' } });
  fakeFetch(() => { throw Error('YouTube must not be called without a key'); });
  assert.equal((await noYoutube.handlers.POST(post({ action: 'analyze', video: VIDEO }))).status, 200);
  assert.deepEqual(noYoutube.stats.aiParams.extra, { description: '', comments: [] });
});

test('analyze: AI failures and save failures give clear errors, save nothing, and never leak internals', async () => {
  const aiFail = routeHarness({ analyze: () => { throw new Error('Gemini 요청 실패: 모델 오류'); } });
  fakeFetch(() => ok({ items: [] }));
  const response = await aiFail.handlers.POST(post({ action: 'analyze', video: VIDEO }));
  assert.equal(response.status, 500); assert.match((await response.json()).error, /Gemini 요청 실패/); assert.equal(aiFail.stats.inserts.length, 0);
  const saveFail = routeHarness({ insertError: true });
  const saved = await saveFail.handlers.POST(post({ action: 'analyze', video: VIDEO }));
  const text = await saved.text();
  assert.equal(saved.status, 500); assert.match(text, /저장하지 못했습니다/); assert.ok(!text.includes('SECRET_DB_DETAIL'));
});

test('unknown actions and malformed bodies are refused', async () => {
  const h = routeHarness();
  assert.equal((await h.handlers.POST(post({ action: 'nope' }))).status, 400);
  assert.equal((await h.handlers.POST(new Request('https://test.invalid', { method: 'POST', body: 'not json' }))).status, 400);
});
