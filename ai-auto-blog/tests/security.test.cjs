const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Run the real route handlers with an isolated database. No live writes or paid API calls.
function harness(route, { allowed = true, status = 401, admin = false, posts, fail = null, loseOwner = false } = {}) {
  const rows = { blog_posts: posts ?? [{ id: 1, user_id: 'member-a', content: 'old' }],
    profiles: [{ id: 'member-a', is_admin: admin }], blog_categories: [{ id: 1, name: 'Shared', slug: 'shared', sort_order: 1 }], blog_post_categories: [] };
  const mutations = [];
  let clients = 0;
  const client = { from(table) {
    const filters = [];
    let op = 'select', values;
    const q = {
      select() { return q; }, eq(key, value) { filters.push([key, value]); return q; },
      order() { return q; }, limit() { return q; },
      update(data) { op = 'update'; values = data; return q; },
      insert(data) { op = 'insert'; values = data; return q; },
      delete() { op = 'delete'; return q; },
      single() { return finish(true); }, maybeSingle() { return finish(true); },
      then(resolve, reject) { return finish(false).then(resolve, reject); },
    };
    async function finish(single) {
      if (fail === table) return { data: null, error: { message: 'SECRET_DATABASE_DETAIL' } };
      if (loseOwner && op !== 'select' && table === 'blog_posts') rows.blog_posts[0].user_id = 'member-b';
      const matched = (rows[table] ?? []).filter(row => filters.every(([key, value]) => row[key] === value));
      if (op !== 'select') {
        mutations.push({ table, op, filters, matched: matched.length });
        if (op === 'update') matched.forEach(row => Object.assign(row, values));
        if (op === 'delete') rows[table] = rows[table].filter(row => !matched.includes(row));
      }
      return { data: single ? matched[0] ?? null : matched, error: null };
    }
    return q;
  } };
  const module = { exports: {} };
  const source = fs.readFileSync(path.resolve(__dirname, '..', route), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const requestAccess = async () => allowed ? { allowed: true, user: { id: 'member-a' } } : { allowed: false, status, error: 'Denied' };
  function mockRequire(name) {
    if (name === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } };
    if (name.endsWith('/supabase/admin')) return { createAdminClient() { clients++; return client; } };
    if (name.endsWith('/access')) return { checkProgramAccessApi: requestAccess };
    if (name.endsWith('/markdown')) return { mdLiteToHtml: value => value };
    if (name.endsWith('/privateResponse')) {
      const privateModule = { exports: {} };
      const privateSource = fs.readFileSync(path.resolve(__dirname, '../utils/privateResponse.ts'), 'utf8');
      const privateOutput = ts.transpileModule(privateSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
      vm.runInNewContext(privateOutput, { module: privateModule, exports: privateModule.exports, require: mockRequire, Headers });
      return privateModule.exports;
    }
    throw Error(`Unexpected import: ${name}`);
  }
  vm.runInNewContext(output, { exports: module.exports, module, console: { error() {} }, require: mockRequire });
  return { handlers: module.exports, mutations, rows, clients: () => clients };
}

const postRoute = 'app/api/posts/[id]/route.ts';
const categoryRoute = 'app/api/categories/route.ts';
const context = id => ({ params: Promise.resolve({ id: String(id) }) });
const request = (method, body = {}) => new Request('https://test.invalid/api', { method, ...(method === 'GET' ? {} : { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }) });

for (const method of ['GET', 'PUT', 'DELETE']) {
  for (const status of [401, 403]) test(`${method}: unauthenticated/no entitlement never opens database (${status})`, async () => {
    const h = harness(postRoute, { allowed: false, status });
    const r = await h.handlers[method](request(method), context(1));
    assert.equal(r.status, status); assert.equal(h.clients(), 0); assert.equal(h.mutations.length, 0);
  });
  for (const owner of ['member-b', null]) test(`${method}: foreign/unowned post is hidden without mutation (${owner})`, async () => {
    const h = harness(postRoute, { posts: [{ id: 1, user_id: owner, content: 'PRIVATE' }] });
    const r = await h.handlers[method](request(method, { title: 'Changed', content: 'Updated' }), context(1));
    assert.equal(r.status, 404); assert.equal(h.mutations.length, 0);
    assert.ok(!(await r.text()).includes('PRIVATE'));
  });
  for (const id of ['-1', '1.2', 'Infinity', '9007199254740992']) test(`${method}: rejects invalid id ${id}`, async () => {
    const h = harness(postRoute); const r = await h.handlers[method](request(method), context(id));
    assert.equal(r.status, 400); assert.equal(h.clients(), 0);
  });
}
test('GET: owner can read the post', async () => {
  const h = harness(postRoute); const r = await h.handlers.GET(request('GET'), context(1));
  assert.equal(r.status, 200); assert.equal((await r.json()).data.content, 'old');
  assert.equal(r.headers.get('Cache-Control'), 'private, no-store, max-age=0');
});
test('PUT: owner can edit; mutation itself also filters owner', async () => {
  const h = harness(postRoute); const r = await h.handlers.PUT(request('PUT', { title: 'Changed', content: 'Updated' }), context(1));
  assert.equal(r.status, 200); assert.equal(h.rows.blog_posts[0].content, 'Updated');
  assert.ok(h.mutations[0].filters.some(([key, value]) => key === 'user_id' && value === 'member-a'));
});
test('DELETE: owner can delete; mutation itself also filters owner', async () => {
  const h = harness(postRoute); const r = await h.handlers.DELETE(request('DELETE'), context(1));
  assert.equal(r.status, 200); assert.equal(h.rows.blog_posts.length, 0);
  assert.ok(h.mutations.find(m => m.table === 'blog_posts').filters.some(([key, value]) => key === 'user_id' && value === 'member-a'));
});
test('DELETE: database lookup failure stops before any mutation and hides database details', async () => {
  const h = harness(postRoute, { fail: 'blog_posts' }); const r = await h.handlers.DELETE(request('DELETE'), context(1));
  assert.equal(r.status, 500); assert.equal(h.mutations.length, 0); assert.ok(!(await r.text()).includes('SECRET_DATABASE_DETAIL'));
});
test('PUT: ownership change between read and write cannot edit the new owner', async () => {
  const h = harness(postRoute, { loseOwner: true }); const r = await h.handlers.PUT(request('PUT', { title: 'Changed', content: 'Updated' }), context(1));
  assert.equal(r.status, 500); assert.equal(h.rows.blog_posts[0].content, 'old');
});
test('DELETE: no affected post is not reported as success', async () => {
  const h = harness(postRoute, { loseOwner: true }); const r = await h.handlers.DELETE(request('DELETE'), context(1));
  assert.equal(r.status, 409); assert.equal(h.rows.blog_posts.length, 1);
});
for (const method of ['POST', 'PATCH', 'DELETE']) {
  test(`categories ${method}: ordinary member cannot mutate shared categories`, async () => {
    const h = harness(categoryRoute); const r = await h.handlers[method](request(method, { id: 1, name: 'Changed', is_admin: true }));
    assert.equal(r.status, 403); assert.equal(h.mutations.length, 0);
  });
  test(`categories ${method}: missing entitlement stops before database`, async () => {
    const h = harness(categoryRoute, { allowed: false, status: 403 }); const r = await h.handlers[method](request(method));
    assert.equal(r.status, 403); assert.equal(h.clients(), 0);
  });
}
test('categories GET: authorized member sees list with read-only permission', async () => {
  const h = harness(categoryRoute); const r = await h.handlers.GET();
  assert.equal(r.status, 200); assert.equal((await r.json()).canManage, false);
});
test('categories PATCH: actual admin can rename', async () => {
  const h = harness(categoryRoute, { admin: true }); const r = await h.handlers.PATCH(request('PATCH', { id: 1, name: 'Changed' }));
  assert.equal(r.status, 200); assert.equal(h.rows.blog_categories[0].name, 'Changed');
});
test('categories PATCH: client admin flag cannot bypass failed server lookup', async () => {
  const h = harness(categoryRoute, { admin: true, fail: 'profiles' }); const r = await h.handlers.PATCH(request('PATCH', { id: 1, name: 'Changed', is_admin: true }));
  assert.equal(r.status, 500); assert.equal(h.mutations.length, 0);
});
