const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const releases = JSON.parse(fs.readFileSync(path.join(root, 'docs/supabase-compat-rollout-20261016/releases.json'), 'utf8'));
const cases = [
  ['legacy only', { NEXT_PUBLIC_SUPABASE_ANON_KEY: 'old-public', SUPABASE_SERVICE_ROLE_KEY: 'old-private' }, 'old-public', 'old-private'],
  ['new only', { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'new-public', SUPABASE_SECRET_KEY: 'new-private' }, 'new-public', 'new-private'],
  ['new priority', { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ' new-public ', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'old-public', SUPABASE_SECRET_KEY: ' new-private ', SUPABASE_SERVICE_ROLE_KEY: 'old-private' }, 'new-public', 'new-private'],
  ['blank new', { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ' ', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'old-public', SUPABASE_SECRET_KEY: ' ', SUPABASE_SERVICE_ROLE_KEY: 'old-private' }, 'old-public', 'old-private'],
];
function load(file, values) {
  const captured = [];
  const instantiate = (url, key) => { captured.push({ url, key }); return { marker: 'mock-supabase' }; };
  const cache = new Map();
  const env = { NEXT_PUBLIC_SUPABASE_URL: 'https://example.invalid', ...values };
  function compile(full) {
    if (cache.has(full)) return cache.get(full);
    const source = fs.readFileSync(full, 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    cache.set(full, exports);
    function requireMock(name) {
      if (name === 'server-only') return {};
      if (name === '@supabase/ssr') return { createBrowserClient: instantiate, createServerClient: instantiate };
      if (name === '@supabase/supabase-js') return { createClient: instantiate };
      if (name === 'next/headers') return { cookies: async () => ({ getAll: () => [], set() {} }), headers: async () => ({ get: () => 'test.buylife.xyz' }) };
      if (name === 'react') return { cache: f => f };
      if (/cookieDomain$/.test(name)) return { cookieDomainForHost: () => '.buylife.xyz', getCookieDomain: () => '.buylife.xyz' };
      if (name.startsWith('.')) return compile(path.resolve(path.dirname(full), name + '.ts'));
      throw new Error(`Unmocked dependency: ${name} in ${path.relative(root, full)}`);
    }
    vm.runInNewContext(code, { exports, require: requireMock, process: { env }, Buffer }, { filename: full });
    return exports;
  }
  return { exports: compile(path.join(root, file)), captured };
}
for (const release of releases) {
  const files = release.runtime_files.filter(f => /\/supabase\/(client|server|admin|service)\.ts$/.test('/' + f));
  if (release.slug === 'blog-content-maker') files.push('blog-content-maker/src/lib/supabase/client.ts', 'blog-content-maker/src/lib/supabase/server.ts', 'blog-content-maker/src/lib/supabase/admin.ts');
  test(`${release.slug}: real browser/server/admin factories select correct credential class`, async () => {
    let count = 0;
    for (const file of files) {
      for (const [, env, publicKey, secretKey] of cases) {
        const { exports, captured } = load(file, env);
        for (const name of ['createClient', 'createAdminClient', 'createServiceClient', 'createServiceRoleClient']) {
          if (typeof exports[name] !== 'function') continue;
          captured.length = 0;
          await exports[name]();
          assert.equal(captured.length, 1, `${file} ${name}: exactly one construction, no retries`);
          const admin = /Admin|Service/.test(name) || /\/(admin|service)\.ts$/.test(file);
          assert.equal(captured[0].key, admin ? secretKey : publicKey, `${file} ${name}`);
          count++;
        }
      }
    }
    assert.ok(count > 0, 'at least one runtime factory was exercised');
  });
}
for (const file of ['utils/supabase/admin.ts', 'tarot/lib/supabase/server.ts']) {
  test(`${file}: missing admin key never falls back to public credentials`, () => {
    const { exports, captured } = load(file, { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-marker', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-old' });
    assert.throws(() => exports.createAdminClient());
    assert.equal(captured.length, 0);
  });
}
test('all changed TypeScript/JavaScript parses without new syntax errors', () => {
  const files = JSON.parse(fs.readFileSync(path.join(root, 'docs/supabase-compat-rollout-20261016/changed-files.json'), 'utf8'));
  for (const file of files.filter(f => /\.[cm]?[jt]sx?$/.test(f))) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    assert.equal(parsed.parseDiagnostics.length, 0, file);
  }
});
