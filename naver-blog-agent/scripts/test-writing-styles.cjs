// 실제 AI 키·유료 호출 없이 원본 TS 파이프라인의 요청 전달을 검사합니다.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
let calls = [];
let hasAccess = true;
let keyLookups = 0;
let keyAvailable = false;
let reviewerReply = null;

async function callAI(config, system, user) {
  calls.push({ system, user });
  if (system.includes('기획 에이전트')) return JSON.stringify({ finalTitle: '유지비 비교', subsections: [{ title: '비교 항목', keyPoints: ['소비전력 확인'] }] });
  if (system.includes('파워블로거')) return '[SECTION - 비교 항목]\n\n가격과 유지비를 확인한다.\n\n[SECTION - 참고자료]';
  if (system.includes('Humanizer 지침')) return JSON.stringify({ edits: [] });
  if (reviewerReply !== null) return reviewerReply;
  return JSON.stringify({ tags: ['유지비'], reviewStatus: 'PASS' });
}

function loadTS(filename) {
  if (cache.has(filename)) return cache.get(filename);
  const module = { exports: {} };
  cache.set(filename, module.exports);
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  function mockRequire(id) {
    if (id === './models') return { callAI, parseJsonSafe: (text, fallback) => { try { return JSON.parse(text); } catch { return fallback; } } };
    if (id === '@/lib/access') return { checkProgramAccessApi: async () => hasAccess ? { allowed: true, userId: 'test-user' } : { allowed: false, error: '로그인이 필요합니다.', status: 401 } };
    if (id === '@/lib/apiKeys') return { resolveAvailableAI: async (userId) => { assert.equal(userId, 'test-user'); keyLookups++; return keyAvailable ? { provider: 'openai', apiKey: 'mock-not-a-key' } : null; } };
    if (id === '@/lib/supabase/admin') return { createAdminClient:()=>({from(table){let inserted=false;const q={select(){return q;},eq(){return q;},order(){return q;},limit(){return q;},insert(){inserted=true;return q;},maybeSingle:async()=>({data:{id:'account'}}),single:async()=>({data:{id:'00000000-0000-4000-8000-000000000001'}}),then(resolve){resolve({data:[],error:null});}};return q;}}) };
    if (id.startsWith('@/') || id.startsWith('.')) {
      const target = id.startsWith('@/') ? path.join(root, 'src', id.slice(2)) : path.resolve(path.dirname(filename), id);
      return loadTS(fs.existsSync(target + '.ts') ? target + '.ts' : path.join(target, 'index.ts'));
    }
    return require(id);
  }
  vm.runInThisContext(`(function(require,module,exports){${js}\n})`, { filename })(mockRequire, module, module.exports);
  cache.set(filename, module.exports);
  return module.exports;
}

(async () => {
  const styles = loadTS(path.join(root, 'src/lib/ai/writingStyles.ts'));
  const { runBlogGenerationPipeline } = loadTS(path.join(root, 'src/lib/ai/pipeline.ts'));
  calls = [];
  await runBlogGenerationPipeline({ category: '생활정보', topic: '에어컨 전기요금', searchKeywords: '에어컨 절전, 인버터', publishPurpose: '여름철 전기요금 절약 안내', aiConfig: { provider: 'openai', apiKey: 'mock-not-a-key' } });
  const writerCall = calls.find((c) => c.system.includes('파워블로거'));
  for (const text of ['에어컨 전기요금', '에어컨 절전, 인버터', '여름철 전기요금 절약 안내']) assert.ok(writerCall.user.includes(text), `Writer prompt must include: ${text}`);
  // Reviewer: 본문 전체 전달, 파싱 실패≠PASS, 글자수 판정
  const base = { category: '생활정보', aiConfig: { provider: 'openai', apiKey: 'mock-not-a-key' } };
  calls = []; reviewerReply = null;
  const okLen = await runBlogGenerationPipeline({ ...base, targetLength: 14 });
  const reviewCall = calls.find((c) => c.system.includes('검수관'));
  assert.ok(reviewCall.user.includes('가격과 유지비를 확인한다.'), 'Reviewer must receive the full body');
  assert.equal(okLen.reviewStatus, 'PASS');
  reviewerReply = '이건 JSON이 아닙니다';
  const broken = await runBlogGenerationPipeline({ ...base, targetLength: 14 });
  assert.equal(broken.reviewStatus, 'UNKNOWN', 'Unparseable review must not be PASS');
  assert.equal(broken.stepsLog.find((l) => l.step.startsWith('4.')).status, 'warn');
  assert.ok(broken.tags.length >= 5, 'fallback tags');
  reviewerReply = JSON.stringify({ reviewStatus: 'PASS' });
  const noTags = await runBlogGenerationPipeline({ ...base, targetLength: 14 });
  assert.ok(Array.isArray(noTags.tags) && noTags.tags.length > 0, 'missing tags must not crash');
  reviewerReply = JSON.stringify({ tags: ['a'], reviewStatus: 'PASS' });
  const tooShort = await runBlogGenerationPipeline({ ...base, targetLength: 4000 });
  assert.equal(tooShort.reviewStatus, 'WARN', 'PASS with length out of range must downgrade');
  assert.ok(tooShort.stepsLog.find((l) => l.step.startsWith('4.')).message.includes('부족'));
  reviewerReply = JSON.stringify({ tags: ['a'], reviewStatus: 'FAIL', reviewNote: '수치 근거 없음' });
  assert.equal((await runBlogGenerationPipeline({ ...base, targetLength: 14 })).reviewStatus, 'FAIL');
  reviewerReply = null;
  assert.equal(styles.WRITING_TONES.length, 4);
  assert.equal(styles.WRITING_STYLES.length, 8);
  for (const tone of styles.WRITING_TONES) {
    for (const style of styles.WRITING_STYLES) {
      calls = [];
      const result = await runBlogGenerationPipeline({ category: '생활정보', preferredTone: tone.value, writingStyle: style.value, persona: { id: 'test', name: '주부형', badge: '비교', tonePrompt: '해요체로 작성해줘.' }, aiConfig: { provider: 'openai', apiKey: 'mock-not-a-key' } });
      assert.equal(calls.length, 4);
      for (const call of calls.slice(1)) {
        assert.ok(call.system.includes(`말끝: ${tone.value}.`));
        assert.ok(call.system.includes(`문체: ${style.label}.`));
        assert.ok(call.system.includes('페르소나의 어조보다 우선'));
        assert.ok(call.system.includes('수치, 출처를 지어내지 않는다'));
      }
      assert.equal(result.preferredTone, tone.value);
      assert.equal(result.writingStyle, style.value);
      assert.ok(styles.getWritingStyleExample(tone.value, style.value).endsWith('.'));
    }
  }
  calls = [];
  const legacy = await runBlogGenerationPipeline({ category: '생활정보', aiConfig: {} });
  assert.equal(legacy.preferredTone, '해요체');
  assert.equal(legacy.writingStyle, 'default');
  assert.ok(!styles.isWritingTone('임의 말투'));
  assert.ok(!styles.isWritingStyle('임의 프롬프트'));
  assert.ok(!styles.isWritingStyle({ value: 'plain' }));

  const { POST } = loadTS(path.join(root, 'src/app/api/generate/route.ts'));
  const request = (body) => new Request('https://test.local/api/generate', { method: 'POST', body: JSON.stringify({blogId:'myblog',...body}) });
  assert.equal((await POST(request({ category: '생활', preferredTone: '임의 말투' }))).status, 400);
  assert.equal((await POST(request({ category: '생활', writingStyle: ['plain'] }))).status, 400);
  assert.equal(keyLookups, 0, 'invalid styles must fail before API key lookup');
  const valid = await POST(request({ category: '생활', preferredTone: '한다체', writingStyle: 'plain' }));
  assert.equal(valid.status, 400);
  assert.equal((await valid.json()).needKey, true);
  keyAvailable = true;
  const generated = await POST(request({ category: '생활', preferredTone: '한다체', writingStyle: 'plain' }));
  assert.equal(generated.status, 200);
  const generatedBody = await generated.json();
  assert.equal(generatedBody.result.preferredTone, '한다체');
  assert.equal(generatedBody.result.writingStyle, 'plain');
  hasAccess = false;
  assert.equal((await POST(request({ category: '생활', writingStyle: 'plain' }))).status, 401);
  console.log('PASS: 32 combinations, legacy defaults, prompt priority/safety, API validation and auth guard (no paid API calls).');
})().catch((error) => { console.error(error); process.exitCode = 1; });
