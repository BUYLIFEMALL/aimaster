import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { actors, createDb, clientFor, loadTs } from './helpers/customPromptDb.mjs';

const { createCustomPromptHandlers } = loadTs('lib/prompts/customPromptHandlers.ts');
const request = (method, body, id) => new Request('http://localhost/api/prompts/custom' + (id ? '?id=' + encodeURIComponent(id) : ''), {
  method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
});

test('every personal endpoint authorizes before accessing storage', async () => {
  for (const status of [401, 403]) {
    const api = createCustomPromptHandlers({
      authorize: async () => ({ user: null, errorResponse: Response.json({ error: 'denied' }, { status }) }),
      client: async () => { throw Error('Storage must not be accessed'); },
    });
    for (const method of ['GET', 'POST', 'PUT', 'DELETE']) assert.equal((await api[method](request(method))).status, status);
  }
});

test('API CRUD uses the authenticated member and Postgres RLS while preserving shared examples', async t => {
  const { db, defaults } = await createDb();
  const apiFor = userId => createCustomPromptHandlers({ authorize: async () => ({ user: { id: userId } }), client: async () => clientFor(db, userId) });
  const a = apiFor(actors.a), b = apiFor(actors.b);
  const sharedBefore = (await db.query('SELECT * FROM public.style_preset_prompts ORDER BY id')).rows;
  const base = defaults[0];
  const payload = { source_prompt_id: base.id, style_id: base.style_id, label: '내 커스텀', prompt: 'My own detailed composition', display_order: 2 };
  let owned;
  try {
    await t.test('a member creates a copy; supplied owner, IDs and retention dates are ignored', async () => {
      const response = await a.POST(request('POST', { ...payload, id: randomUUID(), user_id: actors.b, expires_at: '2099-01-01', created_at: '2000-01-01' }));
      assert.equal(response.status, 201);
      owned = (await response.json()).prompt;
      assert.equal(owned.label, '#내 커스텀'); assert.equal(owned.source_prompt_id, base.id);
      assert.equal(Object.hasOwn(owned, 'user_id'), false);
      const persisted = (await db.query('SELECT * FROM public.ais_user_style_prompts WHERE id=$1', [owned.id])).rows[0];
      assert.equal(persisted.user_id, actors.a); assert.equal(new Date(persisted.expires_at) - new Date(persisted.created_at), 30 * 86400000);
    });
    await t.test('lists contain only own active prompts and prohibit shared caching', async () => {
      const own = await a.GET(request('GET')); assert.equal(own.status, 200);
      assert.equal(own.headers.get('Cache-Control'), 'private, no-store');
      assert.deepEqual((await own.json()).prompts.map(row => row.id), [owned.id]);
      assert.deepEqual((await (await b.GET(request('GET'))).json()).prompts, []);
    });
    await t.test('another member cannot load a direct link, update, or delete it', async () => {
      assert.equal((await b.GET(request('GET', undefined, owned.id))).status, 404);
      assert.equal((await b.PUT(request('PUT', { ...payload, id: owned.id, prompt: 'Not mine' }))).status, 404);
      assert.equal((await b.DELETE(request('DELETE', undefined, owned.id))).status, 404);
    });
    await t.test('owner edits preserve identity, source and the original expiry', async () => {
      const response = await a.PUT(request('PUT', { ...payload, id: owned.id, user_id: actors.b, source_prompt_id: defaults[1].id, expires_at: '2099-01-01', prompt: 'Revised custom scene' }));
      assert.equal(response.status, 200);
      const edited = (await response.json()).prompt;
      assert.equal(edited.prompt, 'Revised custom scene'); assert.equal(edited.source_prompt_id, base.id);
      assert.equal(new Date(edited.expires_at).toISOString(), new Date(owned.expires_at).toISOString());
    });
    await t.test('invalid JSON, IDs, fields and nonexistent sources are rejected', async () => {
      assert.equal((await a.POST(new Request('http://localhost/api/prompts/custom', { method: 'POST', body: '{' }))).status, 400);
      assert.equal((await a.POST(request('POST', { ...payload, source_prompt_id: randomUUID() }))).status, 404);
      assert.equal((await a.POST(request('POST', { ...payload, prompt: ' ' }))).status, 400);
      assert.equal((await a.PUT(request('PUT', { ...payload, id: 'invalid' }))).status, 400);
      assert.equal((await a.GET(request('GET', undefined, 'invalid'))).status, 400);
      assert.equal((await a.DELETE(request('DELETE', undefined, 'invalid'))).status, 400);
    });
    await t.test('shared example IDs never modify or delete the common source through this API', async () => {
      assert.equal((await a.PUT(request('PUT', { ...payload, id: base.id }))).status, 404);
      assert.equal((await a.DELETE(request('DELETE', undefined, base.id))).status, 404);
      assert.deepEqual((await db.query('SELECT * FROM public.style_preset_prompts ORDER BY id')).rows, sharedBefore);
    });
    await t.test('expired data cannot be loaded, edited or deleted through the active library', async () => {
      const id = randomUUID();
      await db.exec('ALTER TABLE public.ais_user_style_prompts DISABLE TRIGGER ais_stamp_user_style_prompt');
      await db.query(`INSERT INTO public.ais_user_style_prompts(id,user_id,style_id,label,prompt,created_at,expires_at)
        VALUES($1,$2,'photorealistic','expired','expired',now()-interval '31 days',now()-interval '1 day')`, [id, actors.a]);
      await db.exec('ALTER TABLE public.ais_user_style_prompts ENABLE TRIGGER ais_stamp_user_style_prompt');
      assert.equal((await a.GET(request('GET', undefined, id))).status, 404);
      assert.equal((await a.PUT(request('PUT', { ...payload, id }))).status, 404);
      assert.equal((await a.DELETE(request('DELETE', undefined, id))).status, 404);
      assert.equal((await (await a.GET(request('GET'))).json()).prompts.length, 1);
    });
    await t.test('owner deletion removes the copy and keeps all 160 defaults intact', async () => {
      assert.equal((await a.DELETE(request('DELETE', undefined, owned.id))).status, 200);
      assert.equal((await a.GET(request('GET', undefined, owned.id))).status, 404);
      assert.deepEqual((await db.query('SELECT * FROM public.style_preset_prompts ORDER BY id')).rows, sharedBefore);
    });
  } finally { await db.close(); }
});
