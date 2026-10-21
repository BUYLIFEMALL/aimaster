// 받은편지함 서버 동작(승인·건너뛰기·되돌리기) 자동 시험 — 가짜 DB·가짜 권한·가짜 플랫폼.
// 실행: npm test (comment-inbox 폴더). 실제 DB·플랫폼에는 접속하지 않는다.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createFakeSupabase } from "./fakes/supabase.mjs";
import { fake } from "./fakes/platform.mjs";
import { app } from "./fakes/app.mjs";
import { approveInboxItemAction, skipInboxItemAction, unskipInboxItemAction } from "../lib/actions/inbox.ts";

const USER = "user-1";
let tables;

beforeEach(() => {
  fake.reset();
  tables = {
    ig_comments: [{ id: "c1", user_id: USER, status: "pending_review", replied_at: null, ig_comment_id: "x" }],
    th_comments: [{ id: "t1", user_id: USER, status: "pending_review", replied_at: null, threads_reply_id: "x" }],
    ytreply_comments: [{ id: "y1", user_id: USER, status: "pending_review", replied_at: null, youtube_comment_id: "x" }],
    dm_messages: [{ id: "d1", user_id: USER, status: "pending_review", replied_at: null, conversation_id: "conv-1" }],
    dm_conversations: [{ id: "conv-1", user_id: USER, ig_scoped_id: "cust", disclosure_sent_at: "2026-10-21T00:00:00.000Z" }],
    dm_settings: [{ user_id: USER, disclosure_message: "안내" }],
  };
  app.reset(createFakeSupabase(tables));
});

test("승인: 원래 프로그램 권한이 없으면 거절하고 게시하지 않는다", async () => {
  app.access["threads-comment-reply"] = false;
  const r = await approveInboxItemAction("threads", "t1", "답장");
  assert.match(r.error, /쓰레드 댓글 자동화 이용 권한/);
  assert.equal(fake.calls, 0);
  assert.equal(tables.th_comments[0].status, "pending_review");
});

test("승인: 권한이 있으면 게시하고 사용 기록을 남긴다(플랫폼 4종)", async () => {
  for (const [platform, id, table] of [["ig_comment", "c1", "ig_comments"], ["threads", "t1", "th_comments"], ["youtube", "y1", "ytreply_comments"], ["ig_dm", "d1", "dm_messages"]]) {
    const r = await approveInboxItemAction(platform, id, "답장");
    assert.equal(r.success, true, platform);
    assert.equal(tables[table][0].status, "posted", platform);
  }
  assert.equal(fake.calls, 4);
  assert.deepEqual(app.usage.map((u) => u.action), ["approve_ig_comment", "approve_threads", "approve_youtube", "approve_ig_dm"]);
});

test("승인: 받은편지함에서 동시에 두 번 눌러도 한 번만 게시", async () => {
  const rs = await Promise.all([approveInboxItemAction("ig_comment", "c1", "답장"), approveInboxItemAction("ig_comment", "c1", "답장")]);
  assert.equal(fake.calls, 1);
  assert.equal(rs.filter((r) => r.success).length, 1);
});

test("승인: 빈 내용과 알 수 없는 플랫폼은 거절", async () => {
  assert.match((await approveInboxItemAction("ig_comment", "c1", "   ")).error, /입력/);
  assert.match((await approveInboxItemAction("kakao", "c1", "답장")).error, /알 수 없는/);
  assert.equal(fake.calls, 0);
});

test("건너뛰기: 검토 대기만 skipped로, 게시된 항목은 그대로", async () => {
  assert.equal((await skipInboxItemAction("ig_comment", "c1")).success, true);
  assert.equal(tables.ig_comments[0].status, "skipped");
  tables.th_comments[0].status = "posted";
  await skipInboxItemAction("threads", "t1");
  assert.equal(tables.th_comments[0].status, "posted");
});

test("건너뛰기: 다른 회원의 항목은 바꾸지 않는다", async () => {
  tables.ig_comments[0].user_id = "someone-else";
  await skipInboxItemAction("ig_comment", "c1");
  assert.equal(tables.ig_comments[0].status, "pending_review");
});

test("건너뛰기: 원래 프로그램 권한이 없으면 거절", async () => {
  app.access["youtube-auto-reply"] = false;
  assert.ok((await skipInboxItemAction("youtube", "y1")).error);
  assert.equal(tables.ytreply_comments[0].status, "pending_review");
});

test("되돌리기: 방금 건너뛴 본인 항목을 다시 검토 대기로", async () => {
  await skipInboxItemAction("ig_dm", "d1");
  assert.equal(tables.dm_messages[0].status, "skipped");
  const r = await unskipInboxItemAction("ig_dm", "d1");
  assert.equal(r.success, true);
  assert.equal(tables.dm_messages[0].status, "pending_review");
});

test("되돌리기: 게시된 항목·검토 대기 항목은 바꾸지 않고 거절", async () => {
  tables.ig_comments[0].status = "posted";
  assert.ok((await unskipInboxItemAction("ig_comment", "c1")).error);
  assert.equal(tables.ig_comments[0].status, "posted");
  assert.ok((await unskipInboxItemAction("threads", "t1")).error);
  assert.equal(tables.th_comments[0].status, "pending_review");
});

test("되돌리기: 다른 회원 항목·권한 없는 플랫폼은 거절", async () => {
  tables.ig_comments[0].status = "skipped";
  tables.ig_comments[0].user_id = "someone-else";
  assert.ok((await unskipInboxItemAction("ig_comment", "c1")).error);
  assert.equal(tables.ig_comments[0].status, "skipped");
  tables.th_comments[0].status = "skipped";
  app.access["threads-comment-reply"] = false;
  assert.ok((await unskipInboxItemAction("threads", "t1")).error);
  assert.equal(tables.th_comments[0].status, "skipped");
});

test("오늘 답한 건수의 기준 시각: 한국 시간 오늘 0시", async () => {
  const { kstTodayStartIso } = await import("../lib/inbox/load.ts");
  assert.equal(kstTodayStartIso(Date.UTC(2026, 9, 21, 16, 30)), "2026-10-21T15:00:00.000Z"); // 한국 22일 01:30
  assert.equal(kstTodayStartIso(Date.UTC(2026, 9, 21, 14, 59)), "2026-10-20T15:00:00.000Z"); // 한국 21일 23:59
  assert.equal(kstTodayStartIso(Date.UTC(2026, 9, 21, 15, 0)), "2026-10-21T15:00:00.000Z"); // 한국 22일 00:00
});

test("최근 7일 응대: 한국 시간 날짜로 나누고 범위 밖은 버린다", async () => {
  const { bucketByKstDay } = await import("../lib/inbox/load.ts");
  const now = Date.UTC(2026, 9, 21, 16, 30); // 한국 22일 01:30 → 16~22일
  const days = bucketByKstDay(
    [
      "2026-10-21T15:00:00.000Z", // 한국 22일 00:00 → 오늘
      "2026-10-21T14:59:59.000Z", // 한국 21일 23:59 → 어제
      "2026-10-15T15:00:00.000Z", // 한국 16일 00:00 → 첫날
      "2026-10-15T14:59:59.000Z", // 한국 15일 → 범위 밖
      "2026-10-21T16:00:00.000Z",
    ],
    now,
  );
  assert.deepEqual(days.map((d) => d.label), ["10/16", "10/17", "10/18", "10/19", "10/20", "10/21", "10/22"]);
  assert.deepEqual(days.map((d) => d.count), [1, 0, 0, 0, 0, 1, 2]);
  assert.equal(days[6].weekday, "목");
});
