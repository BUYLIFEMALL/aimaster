// v1.51 백로그 6 「장면 영상화 일괄」 — 가짜 응답 시험(업체 호출·요금 없음). 주인님 2026-11-12 결정: 유료 실제 시험은 하지 않음.
import test from "node:test";
import assert from "node:assert/strict";
import { batchTargets, hasNextImage, runSceneBatch } from "../src/lib/sceneBatch.ts";

const segs = [
  { id: "s3", segment_index: 3, image_url: "u3" },
  { id: "s1", segment_index: 1, image_url: "u1" },
  { id: "s2", segment_index: 2, image_url: null },
  { id: "s4", segment_index: 4, image_url: "u4" },
  { id: "s5", segment_index: 5, image_url: "u5" },
];
const noSleep = async () => {};

test("대상: 이미지 있고 영상·진행 중 작업 없는 장면만, 장면 순서대로", () => {
  const t = batchTargets(segs, { s4: "v4" }, new Set(["s5"]));
  assert.deepEqual(t.map((s) => s.id), ["s1", "s3"]);
  assert.equal(hasNextImage(segs, segs[1]), false); // s1 다음 s2는 이미지 없음
  assert.equal(hasNextImage(segs, segs[0]), true); // s3 다음 s4
});

test("한 장면씩 차례로 — 앞 장면이 끝나야 다음 장면을 보낸다(동시 실행 없음)", async () => {
  const log = []; let active = 0, maxActive = 0;
  const r = await runSceneBatch({
    targets: batchTargets(segs, {}, new Set()),
    submit: async (s) => { active++; maxActive = Math.max(maxActive, active); log.push(`submit ${s.id}`); return { state: "running", job: { id: s.id } }; },
    check: async (s) => { log.push(`check ${s.id}`); active--; return { state: "done" }; },
    sleep: noSleep, shouldStop: () => false,
  });
  assert.deepEqual(r.done, ["s1", "s3", "s4", "s5"]);
  assert.equal(maxActive, 1);
  assert.deepEqual(log.slice(0, 4), ["submit s1", "check s1", "submit s3", "check s3"]);
});

test("실패한 장면은 다시 보내지 않고 목록으로 돌려준다(이중 과금 방지)", async () => {
  const submits = {};
  const r = await runSceneBatch({
    targets: batchTargets(segs, {}, new Set()),
    submit: async (s) => { submits[s.id] = (submits[s.id] ?? 0) + 1; if (s.id === "s3") throw new Error("입력 거절"); return s.id === "s4" ? { state: "done" } : { state: "running", job: { id: s.id } }; },
    check: async (s) => { if (s.id === "s5") throw new Error("업체 오류"); return { state: "done" }; },
    sleep: noSleep, shouldStop: () => false,
  });
  assert.deepEqual(r.done, ["s1", "s4"]);
  assert.deepEqual(r.failed.map((f) => f.id), ["s3", "s5"]);
  assert.equal(r.failed[0].error, "입력 거절");
  assert.ok(Object.values(submits).every((n) => n === 1));
});

test("오래 걸리면 기다리기만 멈추고 작업 번호는 남긴다(장면 카드가 이어서 확인)", async () => {
  const jobs = [];
  const r = await runSceneBatch({
    targets: [segs[1]],
    submit: async () => ({ state: "running", job: { id: "j" } }),
    check: async () => ({ state: "running" }),
    sleep: noSleep, shouldStop: () => false, maxPolls: 3,
    onJob: (s, j) => jobs.push(j ? "save" : "clear"),
  });
  assert.equal(r.failed.length, 1);
  assert.match(r.failed[0].error, /다시 보내지 않음/);
  assert.deepEqual(jobs, ["save"]); // 지우지 않음
});

test("멈추기: 지금 장면이 끝난 뒤 멈추고 남은 장면을 알려 준다", async () => {
  let stop = false;
  const r = await runSceneBatch({
    targets: batchTargets(segs, {}, new Set()),
    submit: async () => ({ state: "done" }),
    check: async () => ({ state: "done" }),
    sleep: noSleep, shouldStop: () => stop,
    onProgress: (p) => { if (p.phase === "done" && p.segment.id === "s1") stop = true; },
  });
  assert.deepEqual(r.done, ["s1"]);
  assert.equal(r.stopped, true);
  assert.deepEqual(r.left, ["s3", "s4", "s5"]);
});
