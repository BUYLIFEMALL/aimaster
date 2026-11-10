import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize, nextScheduled, countdown, kstLabel } from "../src/lib/dashboard.ts";

// 기준 시각: 2026-11-10 12:00 KST = 03:00Z
const NOW = Date.parse("2026-11-10T03:00:00Z");
const p = (o) => ({ id: Math.random().toString(36), platform: "wordpress", title: "t", status: "draft", scheduled_at: null, published_at: null, remote_url: null, error_detail: null, created_at: "2026-11-01T00:00:00Z", ...o });

test("DB01 숫자 집계 — 오늘 예약·초안·이번 달 발행·확인 필요", () => {
  const s = summarize([
    p({ status: "scheduled", scheduled_at: "2026-11-10T05:00:00Z" }), // 오늘 14:00 KST
    p({ status: "scheduled", scheduled_at: "2026-11-10T15:30:00Z" }), // 내일 00:30 KST → 오늘 아님
    p({ status: "draft" }), p({ status: "ready" }),
    p({ status: "published", published_at: "2026-11-02T01:00:00Z" }),
    p({ status: "published", published_at: "2026-10-31T16:00:00Z" }), // 11-01 01:00 KST → 이번 달
    p({ status: "published", published_at: "2026-10-30T00:00:00Z" }),
    p({ status: "uncertain" }), p({ status: "failed" }),
  ], NOW);
  assert.deepEqual(s, { todayScheduled: 1, drafts: 2, publishedThisMonth: 2, needsCheck: 2 });
});

test("DB02 다음 예약 — 플랫폼별, 지난 예약 제외", () => {
  const posts = [
    p({ status: "scheduled", scheduled_at: "2026-11-10T02:00:00Z" }), // 지남
    p({ status: "scheduled", scheduled_at: "2026-11-11T00:00:00Z", title: "늦은" }),
    p({ status: "scheduled", scheduled_at: "2026-11-10T05:14:00Z", title: "가까운" }),
    p({ status: "scheduled", platform: "blogger", scheduled_at: "2026-11-10T04:00:00Z" }),
  ];
  assert.equal(nextScheduled(posts, "wordpress", NOW).title, "가까운");
  assert.equal(nextScheduled([], "blogger", NOW), null);
});

test("DB03 카운트다운·한국 시간 표시", () => {
  assert.equal(countdown("2026-11-10T05:14:00Z", NOW), "T-02:14");
  assert.equal(countdown("2026-11-13T03:00:00Z", NOW), "T-3일");
  assert.equal(countdown("2026-11-10T01:00:00Z", NOW), "T-00:00");
  assert.equal(kstLabel("2026-11-10T05:00:00Z", NOW), "오늘 14:00");
  assert.equal(kstLabel("2026-11-11T00:00:00Z", NOW), "내일 09:00");
  assert.equal(kstLabel("2026-11-20T00:00:00Z", NOW), "11/20 09:00");
});
