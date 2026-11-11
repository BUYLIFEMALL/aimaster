import { test } from "node:test";
import assert from "node:assert/strict";
import { runCleanup } from "../src/lib/cleanup.ts";
import { keepPublishedImages } from "../src/lib/publishFlow.ts";

test("CL01 정리 — 함수가 돌려준 이미지 경로를 100개씩 저장소에서 지움", async () => {
  const removed = [];
  const admin = { rpc: async (fn) => { assert.equal(fn, "wba_cleanup"); return { data: Array.from({ length: 250 }, (_, i) => ({ image_path: `u/p/${i}.jpg` })).concat([{ image_path: null }]), error: null }; },
    storage: { from: (b) => { assert.equal(b, "wba-images"); return { remove: async (paths) => { removed.push(paths.length); return { error: null }; } }; } } };
  assert.deepEqual(await runCleanup(admin), { removedImages: 250, failedBatches: 0 });
  assert.deepEqual(removed, [100, 100, 50]);
});

test("CL02 정리 함수 실패는 오류로(저장소는 건드리지 않음)", async () => {
  let touched = 0;
  const admin = { rpc: async () => ({ data: null, error: { message: "x" } }), storage: { from: () => ({ remove: async () => { touched++; } }) } };
  await assert.rejects(() => runCleanup(admin), /cleanup_failed/); assert.equal(touched, 0);
});

test("CL03 1년 보관은 실제 발행된 글만 — 플랫폼·이미지 수 무관, 예약 대기는 미발행(v1.04)", () => {
  assert.equal(keepPublishedImages("blogger", "published", 2), true);
  assert.equal(keepPublishedImages("blogger", "published", 0), true);
  assert.equal(keepPublishedImages("wordpress", "published", 3), true);
  assert.equal(keepPublishedImages("blogger", "scheduled", 1), false);
  assert.equal(keepPublishedImages("blogger", "draft", 2), false);
  assert.equal(keepPublishedImages("wordpress", "failed", 1), false);
});
