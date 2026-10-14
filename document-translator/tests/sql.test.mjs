import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { emptyState } from "../src/lib/translation/model.ts";
test("proposed migration isolates owners, requires server writes, checks revisions and atomically prevents AI replays", async () => {
  const db = new PGlite(),
    a = randomUUID(),
    b = randomUUID(),
    project = randomUUID(),
    glossary = randomUUID(),
    op = randomUUID(),
    hash = "a".repeat(64);
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid'; grant usage on schema auth to authenticated;`,
    );
    await db.query("insert into auth.users values ($1),($2)", [a, b]);
    await db.exec(
      await readFile(
        "supabase/migrations/20261014082202_document_translator_initial.sql",
        "utf8",
      ),
    );
    await db.exec("set role service_role");
    const payload = emptyState();
    payload.sourceText = "A 회원 원문";
    const created = await db.query(
      "select dt_save_project($1,$2,0,$3,$4) as value",
      [a, project, "첫 번역", JSON.stringify(payload)],
    );
    assert.equal(created.rows[0].value.revision, 1);
    const expiry = created.rows[0].value.expiresAt;
    const updated = await db.query(
      "select dt_save_project($1,$2,1,$3,$4) as value",
      [a, project, "수정 번역", JSON.stringify(payload)],
    );
    assert.equal(updated.rows[0].value.revision, 2);
    assert.equal(updated.rows[0].value.expiresAt, expiry);
    await assert.rejects(
      () =>
        db.query("select dt_save_project($1,$2,1,$3,$4)", [
          a,
          project,
          "오래된 수정",
          JSON.stringify(payload),
        ]),
      (e) => e.code === "40001",
    );
    await assert.rejects(
      () =>
        db.query("select dt_save_project($1,$2,2,$3,$4)", [
          b,
          project,
          "타인 수정",
          JSON.stringify(payload),
        ]),
      (e) => e.code === "42501",
    );
    await db.query("select dt_save_project($1,$2,0,$3,$4)", [
      b,
      randomUUID(),
      "B 기록",
      JSON.stringify(emptyState()),
    ]);
    await db.query("select dt_save_glossary($1,$2,0,$3,$4)", [
      a,
      glossary,
      "A 용어집",
      JSON.stringify([{ sourceTerm: "업무", targetTerm: "work", note: "" }]),
    ]);
    await assert.rejects(
      () =>
        db.query("select dt_save_glossary($1,$2,1,$3,$4)", [
          b,
          glossary,
          "타인 용어집",
          "[]",
        ]),
      (e) => e.code === "42501",
    );
    const claim = async (user, id, h = hash) =>
      (
        await db.query("select dt_claim_operation($1,$2,$3,$4) as value", [
          user,
          id,
          h,
          "translate",
        ])
      ).rows[0].value;
    assert.equal(await claim(a, op), "claimed");
    assert.equal(await claim(a, op), "processing");
    await assert.rejects(
      () => claim(a, op, "b".repeat(64)),
      (e) => e.code === "22023",
    );
    const wrong = await db.query(
      "select dt_finish_operation($1,$2,$3,true) as value",
      [b, op, hash],
    );
    assert.equal(wrong.rows[0].value, false);
    await db.query("select dt_finish_operation($1,$2,$3,true)", [a, op, hash]);
    assert.equal(await claim(a, op), "done");
    assert.equal(await claim(b, op), "claimed");
    await claim(a, randomUUID());
    await claim(a, randomUUID());
    await assert.rejects(
      () => claim(a, randomUUID()),
      (e) => e.code === "53300",
    );
    await db.exec("reset role; set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
    const visible = await db.query("select id,user_id from dt_projects");
    assert.equal(visible.rows.length, 1);
    assert.equal(visible.rows[0].id, project);
    assert.equal(
      (await db.query("select id from dt_glossaries")).rows.length,
      1,
    );
    await assert.rejects(
      () =>
        db.query("select dt_claim_operation($1,$2,$3,$4)", [
          a,
          randomUUID(),
          hash,
          "translate",
        ]),
      (e) => e.code === "42501",
    );
    await assert.rejects(
      () =>
        db.query("update dt_projects set title=$1 where id=$2", [
          "직접 수정",
          project,
        ]),
      (e) => e.code === "42501",
    );
    await assert.rejects(
      () => db.query("select * from dt_operations"),
      (e) => e.code === "42501",
    );
    await db.exec("reset role; set role anon");
    await assert.rejects(
      () => db.query("select * from dt_projects"),
      (e) => e.code === "42501",
    );
    await db.exec("reset role; set role service_role");
    await db.query(
      "update dt_projects set expires_at=now()-interval '1 second' where id=$1",
      [project],
    );
    await assert.rejects(
      () =>
        db.query("select dt_save_project($1,$2,2,$3,$4)", [
          a,
          project,
          "만료 수정",
          JSON.stringify(payload),
        ]),
      (e) => e.code === "P0002",
    );
    await db.exec("reset role; set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
    assert.equal((await db.query("select id from dt_projects")).rows.length, 0);
    await db.exec("reset role; set role service_role");
    const retention = await readFile('supabase/migrations/20261014094000_document_translator_retention.sql','utf8');
    const cleanup = retention.match(/\$\$([\s\S]*?)\$\$/)[1];
    await db.exec(cleanup);
    assert.equal((await db.query('select id from dt_projects')).rows.length,1);
    assert.equal((await db.query('select id from dt_glossaries')).rows.length,1);
    await db.exec('reset role');
    assert.equal((await db.query('select id from auth.users')).rows.length,2);
    const columns = await db.query(
      "select column_name from information_schema.columns where table_name='dt_operations'",
    );
    assert.ok(
      !columns.rows.some((r) =>
        /source|response|key|payload/.test(r.column_name),
      ),
    );
  } finally {
    await db.close();
  }
});
