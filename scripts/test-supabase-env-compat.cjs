// Configuration tests use invented marker strings, never real credentials or live requests.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, env) {
  const source = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, process: { env }, require: name => { assert.equal(name, 'server-only'); return {}; } };
  vm.runInNewContext(compiled, context, { filename: file });
  return context.exports;
}

for (const project of ['lib/supabase', 'blog-content-maker/src/lib/supabase']) {
  for (const [kind, file, fn, preferred, legacy] of [
    ['public', 'env.ts', 'getSupabasePublicKey', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    ['server', 'serverEnv.ts', 'getSupabaseSecretKey', 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  ]) {
    const full = `${project}/${file}`;
    test(`${project}: ${kind} keeps existing-only installations working`, () => {
      assert.equal(load(full, { [legacy]: 'existing-marker' })[fn](), 'existing-marker');
    });
    test(`${project}: ${kind} accepts new-name-only installations`, () => {
      assert.equal(load(full, { [preferred]: 'new-marker' })[fn](), 'new-marker');
    });
    test(`${project}: ${kind} prefers the configured new key without silently trying another key`, () => {
      assert.equal(load(full, { [preferred]: ' new-marker ', [legacy]: 'existing-marker' })[fn](), 'new-marker');
    });
    test(`${project}: ${kind} blank new name does not mask an existing key`, () => {
      assert.equal(load(full, { [preferred]: '  ', [legacy]: 'existing-marker' })[fn](), 'existing-marker');
    });
    test(`${project}: ${kind} never substitutes a different class of credential`, () => {
      const otherClass = kind === 'public' ? { SUPABASE_SECRET_KEY: 'private-marker' } : { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-marker' };
      assert.equal(load(full, otherClass)[fn](), '');
    });
  }
  test(`${project}: public helper contains no server credentials and server helper is guarded`, () => {
    const source = fs.readFileSync(path.resolve(__dirname, '..', project, 'env.ts'), 'utf8');
    assert.doesNotMatch(source, /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|serverEnv/);
    const server = fs.readFileSync(path.resolve(__dirname, '..', project, 'serverEnv.ts'), 'utf8');
    assert.match(server, /import "server-only"/);
  });
}
