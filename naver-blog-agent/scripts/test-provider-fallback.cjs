// 글감 정리 공급사 자동 전환 검사: 크레딧 부족/키 오류 시 다음 공급사로, 전부 실패하면 원인 안내. 실제 API 호출 없음.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const module_ = { exports: {} };
const js = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/lib/ai/providerFallback.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
new Function('module', 'exports', js)(module_, module_.exports);
const { runWithProviderFallback, describeProviderError } = module_.exports;

const quota = Object.assign(new Error('429 You have no credits remaining. Add credits to continue using the API'), { status: 429, code: 'credit_balance_exhausted' });
const calls = [];
const make = (name, impl) => async (key, system, user) => { calls.push(`${name}:${key}`); return impl(key, system, user); };

(async () => {
  // 1) OpenAI 크레딧 부족 → Gemini가 성공: Claude는 호출하지 않는다
  let out = await runWithProviderFallback(
    { openai: 'k-o', gemini: 'k-g', anthropic: 'k-a' }, 'sys', 'usr',
    { openai: make('openai', async () => { throw quota; }), gemini: make('gemini', async () => '{"ok":1}'), anthropic: make('anthropic', async () => 'x') }
  );
  assert.equal(out.provider, 'gemini');
  assert.equal(out.text, '{"ok":1}');
  assert.deepEqual(out.attempts, [{ provider: 'openai', reason: '크레딧 또는 사용 한도 부족' }]);
  assert.deepEqual(calls, ['openai:k-o', 'gemini:k-g']);

  // 2) OpenAI 정상이면 OpenAI만 호출
  calls.length = 0;
  out = await runWithProviderFallback({ openai: 'k-o', gemini: 'k-g' }, 's', 'u', { openai: make('openai', async () => 'A'), gemini: make('gemini', async () => 'B'), anthropic: make('anthropic', async () => 'C') });
  assert.equal(out.provider, 'openai');
  assert.deepEqual(calls, ['openai:k-o']);

  // 3) 키가 없는 공급사는 건너뛴다(Claude만 등록)
  calls.length = 0;
  out = await runWithProviderFallback({ anthropic: 'k-a' }, 's', 'u', { openai: make('openai', async () => 'A'), gemini: make('gemini', async () => 'B'), anthropic: make('anthropic', async () => 'C') });
  assert.equal(out.provider, 'anthropic');
  assert.deepEqual(calls, ['anthropic:k-a']);

  // 4) 빈 응답도 실패로 보고 다음으로
  out = await runWithProviderFallback({ openai: 'a', gemini: 'b' }, 's', 'u', { openai: make('openai', async () => '  '), gemini: make('gemini', async () => 'G'), anthropic: make('anthropic', async () => 'C') });
  assert.equal(out.provider, 'gemini');
  assert.equal(out.attempts[0].reason, '빈 응답');

  // 5) 전부 실패 → 공급사별 이유를 한 문장에
  await assert.rejects(
    runWithProviderFallback({ openai: 'a', gemini: 'b', anthropic: 'c' }, 's', 'u', {
      openai: make('openai', async () => { throw quota; }),
      gemini: make('gemini', async () => { throw Object.assign(new Error('API key not valid'), { status: 400 }); }),
      anthropic: make('anthropic', async () => { throw Object.assign(new Error('model: claude-x not found'), { status: 404 }); }),
    }),
    (e) => /OpenAI\(크레딧 또는 사용 한도 부족\)/.test(e.message) && /Gemini\(API 키 오류\)/.test(e.message) && /Claude\(모델을 찾을 수 없음\)/.test(e.message)
  );

  // 6) 등록된 키가 하나도 없으면 안내 문구
  await assert.rejects(runWithProviderFallback({}, 's', 'u', {}), /등록되어 있지 않습니다/);

  // 7) 오류 설명
  assert.equal(describeProviderError(quota), '크레딧 또는 사용 한도 부족');
  assert.equal(describeProviderError(Object.assign(new Error('Too Many Requests'), { status: 429 })), '요청 한도 초과');
  assert.equal(describeProviderError(Object.assign(new Error('x'), { status: 401 })), 'API 키 오류');
  assert.equal(describeProviderError(new Error('연결이 끊겼습니다')), '연결이 끊겼습니다');

  console.log('provider fallback ok');
})().catch((e) => { console.error(e); process.exit(1); });
