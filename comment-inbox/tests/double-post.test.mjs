// 이중 게시 방지 자동 시험 — 공용 게시 함수 4개(받은편지함 사본 = 원래 프로그램 기준과 같음, check-shared-modules로 보장)를
// 가짜 DB·가짜 플랫폼 호출로 돌린다. 실제 DB·인스타·쓰레드·유튜브에는 접속하지 않는다.
// 실행: npm test (comment-inbox 폴더) — Node 24 내장 시험 도구 + TypeScript 형식 제거, 추가 패키지 없음.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createFakeSupabase } from "./fakes/supabase.mjs";
import { fake } from "./fakes/platform.mjs";
import { postCommentReplyForUser as postInstagram } from "../lib/comments/instagramPost.ts";
import { postCommentReplyForUser as postThreads } from "../lib/comments/threadsPost.ts";
import { postCommentReplyForUser as postYoutube } from "../lib/comments/youtubePost.ts";
import { postDmReplyForUser as postDm } from "../lib/dmApp/dm/post.ts";

const USER = "user-1";
const ago = (ms) => new Date(Date.now() - ms).toISOString();

const PLATFORMS = [
  { name: "인스타 댓글", table: "ig_comments", post: postInstagram, row: { ig_comment_id: "c1" } },
  { name: "쓰레드 댓글", table: "th_comments", post: postThreads, row: { threads_reply_id: "c1" } },
  { name: "유튜브 댓글", table: "ytreply_comments", post: postYoutube, row: { youtube_comment_id: "c1" } },
  {
    name: "인스타 DM",
    table: "dm_messages",
    post: postDm,
    row: { conversation_id: "conv-1" },
    extra: {
      dm_conversations: [{ id: "conv-1", user_id: USER, ig_scoped_id: "cust", disclosure_sent_at: ago(1000) }],
      dm_settings: [{ user_id: USER, disclosure_message: "자동 응답 안내입니다." }],
    },
  },
];

function setup(p, rowOverrides = {}) {
  const tables = {
    [p.table]: [{ id: "item-1", user_id: USER, status: "pending_review", replied_at: null, generated_reply: null, ...p.row, ...rowOverrides }],
    ...structuredClone(p.extra ?? {}),
  };
  return { tables, supabase: createFakeSupabase(tables) };
}

beforeEach(() => fake.reset());

for (const p of PLATFORMS) {
  test(`${p.name}: 두 곳에서 동시에 승인해도 플랫폼 호출은 1번`, async () => {
    const { tables, supabase } = setup(p);
    const results = await Promise.all([p.post(supabase, USER, "item-1", "답장"), p.post(supabase, USER, "item-1", "답장")]);
    assert.equal(fake.calls, 1, "플랫폼 호출 횟수");
    assert.equal(results.filter((r) => r.success).length, 1, "성공 1건");
    assert.match(results.find((r) => !r.success).error, /이미 처리 중이거나 처리된/);
    assert.equal(tables[p.table][0].status, "posted");
  });

  test(`${p.name}: 게시에 실패하면 표시가 풀려 다시 시도할 수 있다`, async () => {
    const { tables, supabase } = setup(p);
    fake.failNext = true;
    const first = await p.post(supabase, USER, "item-1", "답장");
    assert.ok(first.error, "첫 시도 실패");
    assert.equal(tables[p.table][0].status, "failed");
    assert.equal(tables[p.table][0].replied_at, null, "처리 중 표시 해제");
    const retry = await p.post(supabase, USER, "item-1", "답장");
    assert.equal(retry.success, true, "다시 시도 성공");
    assert.equal(fake.calls, 1);
  });

  test(`${p.name}: 2분 넘게 멈춘 처리 중 표시는 다시 처리할 수 있다`, async () => {
    const { supabase } = setup(p, { replied_at: ago(3 * 60 * 1000) });
    const r = await p.post(supabase, USER, "item-1", "답장");
    assert.equal(r.success, true);
    assert.equal(fake.calls, 1);
  });

  test(`${p.name}: 방금 처리 중 표시가 있으면 거절(플랫폼 호출 없음)`, async () => {
    const { supabase } = setup(p, { replied_at: ago(10 * 1000) });
    const r = await p.post(supabase, USER, "item-1", "답장");
    assert.match(r.error, /이미 처리 중이거나 처리된/);
    assert.equal(fake.calls, 0);
  });

  test(`${p.name}: 이미 게시된 항목은 호출 없이 거절`, async () => {
    const { supabase } = setup(p, { status: "posted", replied_at: ago(60 * 60 * 1000) });
    const r = await p.post(supabase, USER, "item-1", "답장");
    assert.ok(r.error);
    assert.equal(fake.calls, 0);
  });

  test(`${p.name}: 다른 회원의 항목은 처리하지 않는다`, async () => {
    const { supabase } = setup(p);
    const r = await p.post(supabase, "someone-else", "item-1", "답장");
    assert.ok(r.error);
    assert.equal(fake.calls, 0);
  });
}

test("인스타 DM: 자동 응답 안내 문구가 없으면 아무것도 보내지 않고 처리 중 표시를 푼다", async () => {
  const dm = PLATFORMS.find((p) => p.table === "dm_messages");
  const { tables, supabase } = setup(dm);
  tables.dm_conversations[0].disclosure_sent_at = null;
  tables.dm_settings[0].disclosure_message = "";
  const r = await dm.post(supabase, USER, "item-1", "답장");
  assert.match(r.error, /고지 문구/);
  assert.equal(fake.calls, 0);
  assert.equal(tables.dm_messages[0].replied_at, null);
  assert.equal(tables.dm_messages[0].status, "pending_review");
});

test("인스타 DM: 첫 답장이면 안내 문구 1번 + 답장 1번(동시 승인해도 그대로)", async () => {
  const dm = PLATFORMS.find((p) => p.table === "dm_messages");
  const { tables, supabase } = setup(dm);
  tables.dm_conversations[0].disclosure_sent_at = null;
  await Promise.all([dm.post(supabase, USER, "item-1", "답장"), dm.post(supabase, USER, "item-1", "답장")]);
  assert.equal(fake.calls, 2, "안내 1 + 답장 1");
  assert.ok(tables.dm_conversations[0].disclosure_sent_at);
});
