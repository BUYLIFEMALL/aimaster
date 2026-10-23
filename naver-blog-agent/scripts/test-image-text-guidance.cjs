const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function loadGenerator(requests) {
  function compile(relative, mockRequire, fetch) {
    const module = { exports: {} };
    const source = fs.readFileSync(path.join(root, relative), 'utf8');
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    new Function('module', 'exports', 'require', 'fetch', 'Buffer', 'AbortSignal', js)(module, module.exports, mockRequire, fetch, Buffer, AbortSignal);
    return module.exports;
  }
  const models = compile('src/lib/ai/contentModels.ts', () => ({}));
  const fetch = async (url, options) => {
    url = String(url);
    requests.push({ url, options });
    if (url.startsWith('https://replicate.delivery/')) {
      return { ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer, headers: { get: () => 'image/png' } };
    }
    return { ok: true, status: 200, json: async () => url.includes('googleapis.com')
      ? { candidates: [{ content: { parts: [{ inlineData: { data: 'AQID', mimeType: 'image/png' } }] } }] }
      : url.includes('api.openai.com') ? { data: [{ b64_json: 'AQID' }] }
      : { status: 'succeeded', output: 'https://replicate.delivery/test.png' } };
  };
  return compile('src/lib/ai/imageGenerator.ts', id => {
    if (id === 'server-only') return {};
    if (id === './contentModels') return models;
    throw new Error('Unexpected import: ' + id);
  }, fetch);
}

test('each image provider receives blank-surface guidance and only the supplied member key', async () => {
  const requests = [];
  const { generateImageBytes } = loadGenerator(requests);
  for (const model of ['nanobanana', 'gpt-image-1', 'black-forest-labs/flux-2-dev', 'prunaai/z-image-turbo']) {
    requests.length = 0;
    await generateImageBytes({ model, ratio: '16:9', prompt: 'Photorealistic blog checklist at a Korean home, no text', apiKey: 'synthetic-member-key' });
    const generations = requests.filter(r => !r.url.startsWith('https://replicate.delivery/'));
    assert.equal(generations.length, 1, 'No automatic paid retry or provider fallback');
    const request = generations[0];
    const body = JSON.parse(request.options.body);
    const prompt = body.contents?.[0]?.parts[0].text || body.prompt || body.input?.prompt;
    assert.match(prompt, /^Photorealistic blog checklist/);
    assert.match(prompt, /boards and signs completely blank/);
    assert.match(prompt, /screens switched off or with simple abstract shapes/);
    assert.match(prompt, /never turn the topic or article title into writing/);
    assert.match(prompt, /invented handwriting/);
    assert.match(prompt, /Preserve the requested visual style and composition/);
    assert.equal(request.options.headers['x-goog-api-key'] || request.options.headers.Authorization, model === 'nanobanana' ? 'synthetic-member-key' : 'Bearer synthetic-member-key');
    assert.equal(request.options.cache, 'no-store');
  }
});

test('long prompts cannot truncate the final no-lettering constraints', () => {
  const { finalizePrompt } = loadGenerator([]);
  const prompt = finalizePrompt('X'.repeat(2000));
  assert.equal(prompt.indexOf('\n\n'), 1500);
  assert.match(prompt, /Korean\/East Asian/);
  assert.match(prompt, /No visible text, letters, words, numbers/);
  assert.ok(prompt.endsWith('without using lettering.'));
});
