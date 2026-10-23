import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { emptyWorkspace } from "../src/lib/planner/model.ts";

test("proposed SQL enforces role permissions, atomic revisions, replay safety and member isolation", async () => {
  const db = new PGlite();
  const userA = randomUUID(), userB = randomUUID(), commandId = randomUUID();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as 'select null::uuid';`);
    await db.query("insert into auth.users values ($1), ($2)", [userA, userB]);
    await db.exec(await readFile("supabase/migrations/20261013065950_planner_workspace.sql", "utf8"));
    const workspace = emptyWorkspace();
    await db.exec("set role service_role");
    await db.query("insert into public.task_planner_workspaces (user_id,payload) values ($1,$3),($2,$3)", [userA, userB, JSON.stringify(workspace)]);
    const changed = { ...workspace, notes: { "2026-10-13": "A 회원 기록" } };
    const result = await db.query("select public.task_planner_commit($1,0,$2,$3) as result", [userA, commandId, JSON.stringify(changed)]);
    assert.equal(result.rows[0].result.revision, 1);
    const replay = await db.query("select public.task_planner_commit($1,0,$2,$3) as result", [userA, commandId, JSON.stringify(workspace)]);
    assert.equal(replay.rows[0].result.revision, 1); assert.equal(replay.rows[0].result.payload.notes["2026-10-13"], "A 회원 기록");
    await assert.rejects(() => db.query("select public.task_planner_commit($1,0,$2,$3)", [userA, randomUUID(), JSON.stringify(workspace)]), e => e.code === "40001");
    const other = await db.query("select revision,payload from public.task_planner_workspaces where user_id=$1", [userB]);
    assert.equal(other.rows[0].revision, 0); assert.deepEqual(other.rows[0].payload.notes, {});
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`reset role; set role ${role}`);
      await assert.rejects(() => db.query("select * from public.task_planner_workspaces"), e => e.code === "42501");
      await assert.rejects(() => db.query("select public.task_planner_commit($1,0,$2,$3)", [userA, randomUUID(), JSON.stringify(workspace)]), e => e.code === "42501");
    }
    await db.exec("reset role");
    const policy = await db.query("select relrowsecurity from pg_class where relname='task_planner_workspaces'"); assert.equal(policy.rows[0].relrowsecurity, true);
  } finally { await db.close(); }
});
