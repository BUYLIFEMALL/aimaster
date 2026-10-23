import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { actors, createDb, asUser, loadTs } from './helpers/customPromptDb.mjs';

test('custom prompt fields validate and ignore ownership/retention input', () => {
  const { validateCustomPrompt, isPromptId } = loadTs('lib/prompts/customStylePrompts.ts');
  const input = { style_id: 'photorealistic', label: '  내 사진  ', prompt: '  Detailed scene  ', display_order: 2, user_id: actors.b, expires_at: '2099-01-01' };
  assert.deepEqual(validateCustomPrompt(input), { ok: true, data: { style_id: 'photorealistic', label: '#내 사진', prompt: 'Detailed scene', display_order: 2 } });
  for (const invalid of [null, [], { ...input, style_id: 'invalid' }, { ...input, prompt: ' ' }, { ...input, label: 'x'.repeat(121) }, { ...input, prompt: 'x'.repeat(20001) }, { ...input, display_order: -1 }, { ...input, display_order: 1.5 }]) {
    assert.equal(validateCustomPrompt(invalid).ok, false);
  }
  assert.equal(isPromptId(randomUUID()), true); assert.equal(isPromptId("' OR true --"), false);
});

test('migration enforces ownership, immutable retention, source preservation and cleanup in Postgres', async t => {
  const { db, defaults } = await createDb();
  let own;
  try {
    await t.test('owner inserts a private copy with a server-stamped 30-day lifetime', async () => {
      own = await asUser(db, actors.a, async () => (await db.query(`INSERT INTO public.ais_user_style_prompts
        (user_id,source_prompt_id,style_id,label,prompt,created_at,expires_at)
        VALUES($1,$2,'photorealistic','내 사진','A custom photo','2000-01-01','2100-01-01') RETURNING *`, [actors.a, defaults[0].id])).rows[0]);
      assert.equal(own.user_id, actors.a);
      assert.ok(Math.abs(new Date(own.created_at).getTime() - Date.now()) < 5000);
      assert.equal(new Date(own.expires_at) - new Date(own.created_at), 30 * 86400000);
    });
    await t.test('another member cannot read, edit or delete the copy', async () => {
      await asUser(db, actors.b, async () => {
        assert.equal((await db.query('SELECT * FROM public.ais_user_style_prompts WHERE id=$1', [own.id])).rows.length, 0);
        assert.equal((await db.query("UPDATE public.ais_user_style_prompts SET prompt='stolen' WHERE id=$1 RETURNING id", [own.id])).rows.length, 0);
        assert.equal((await db.query('DELETE FROM public.ais_user_style_prompts WHERE id=$1 RETURNING id', [own.id])).rows.length, 0);
        await assert.rejects(db.query("INSERT INTO public.ais_user_style_prompts(user_id,style_id,label,prompt) VALUES($1,'photorealistic','x','x')", [actors.a]), /row-level security/);
      });
    });
    await t.test('editing cannot reassign ownership or extend creation/expiry dates', async () => {
      await asUser(db, actors.a, async () => {
        await assert.rejects(db.query('UPDATE public.ais_user_style_prompts SET user_id=$1 WHERE id=$2', [actors.b, own.id]), /cannot be changed/);
        await assert.rejects(db.query("UPDATE public.ais_user_style_prompts SET created_at=now() WHERE id=$1", [own.id]), /cannot be changed/);
        await assert.rejects(db.query("UPDATE public.ais_user_style_prompts SET expires_at=expires_at+interval '1 day' WHERE id=$1", [own.id]), /cannot be changed/);
        const edited = (await db.query("UPDATE public.ais_user_style_prompts SET prompt='My revised scene' WHERE id=$1 RETURNING *", [own.id])).rows[0];
        assert.equal(edited.prompt, 'My revised scene');
        assert.equal(new Date(edited.expires_at).toISOString(), new Date(own.expires_at).toISOString());
      });
    });
    await t.test('deleting the shared source preserves the member copy', async () => {
      await db.query('DELETE FROM public.style_preset_prompts WHERE id=$1', [defaults[0].id]);
      const row = (await db.query('SELECT source_prompt_id,prompt FROM public.ais_user_style_prompts WHERE id=$1', [own.id])).rows[0];
      assert.equal(row.source_prompt_id, null); assert.equal(row.prompt, 'My revised scene');
    });
    await t.test('expired rows are hidden before physical cleanup, including from their owner', async () => {
      await db.exec('ALTER TABLE public.ais_user_style_prompts DISABLE TRIGGER ais_stamp_user_style_prompt');
      const id = randomUUID();
      await db.query(`INSERT INTO public.ais_user_style_prompts(id,user_id,style_id,label,prompt,created_at,expires_at)
        VALUES($1,$2,'photorealistic','expired','expired',now()-interval '31 days',now()-interval '1 day')`, [id, actors.a]);
      await db.exec('ALTER TABLE public.ais_user_style_prompts ENABLE TRIGGER ais_stamp_user_style_prompt');
      await asUser(db, actors.a, async () => {
        assert.equal((await db.query('SELECT id FROM public.ais_user_style_prompts WHERE id=$1', [id])).rows.length, 0);
        assert.equal((await db.query("UPDATE public.ais_user_style_prompts SET prompt='revive' WHERE id=$1 RETURNING id", [id])).rows.length, 0);
        await assert.rejects(db.query('SELECT public.cleanup_ais_expired_custom_prompts()'), /permission denied/);
      });
      assert.equal((await db.query('SELECT public.cleanup_ais_expired_custom_prompts() AS removed')).rows[0].removed, 1);
      assert.equal((await db.query('SELECT count(*)::int AS count FROM public.ais_user_style_prompts')).rows[0].count, 1);
    });
    await t.test('anonymous access is denied and a minute-based cleanup job is registered', async () => {
      await db.exec('SET ROLE anon');
      try { await assert.rejects(db.query('SELECT * FROM public.ais_user_style_prompts'), /permission denied/); }
      finally { await db.exec('RESET ROLE'); }
      const job = (await db.query('SELECT * FROM cron.fixture_jobs')).rows[0];
      assert.equal(job.jobname, 'ais-custom-prompts-retention-30d'); assert.equal(job.schedule, '* * * * *');
      assert.equal(job.command, 'select public.cleanup_ais_expired_custom_prompts();');
    });
  } finally { await db.close(); }
});
