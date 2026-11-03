import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createQueue } from "../src/queue.mjs";
import { createRunner, parseTaskState } from "../src/runner.mjs";
import { listeningPids } from "../src/acestep.mjs";

test("남은 음악 엔진 찾기: 그 번호를 기다리는(LISTENING) 프로그램 번호만", () => {
  const text = [
    "  TCP    127.0.0.1:47822        0.0.0.0:0              LISTENING       12345",
    "  TCP    127.0.0.1:47822        127.0.0.1:50001        ESTABLISHED     12345",
    "  TCP    127.0.0.1:47821        127.0.0.1:57201        FIN_WAIT_2      49524",
    "  TCP    127.0.0.1:147822       0.0.0.0:0              LISTENING       777",
  ].join("\r\n");
  assert.deepEqual(listeningPids(text, 47822), [12345]);
  assert.deepEqual(listeningPids(text, 47821), []);
});

const tmpFile = async () => path.join(await mkdtemp(path.join(os.tmpdir(), "fms-q-")), "queue.json");
const track = (id = "11111111-1111-4111-8111-111111111111") => ({ id, song_id: null, style_prompt: "pop", lyrics: "[Verse]\n가사", duration_sec: 30, device: "cpu", kind: "text2music" });
const until = async (fn) => {
  for (let i = 0; i < 100 && !fn(); i++) await new Promise((r) => setTimeout(r, 5));
};

test("대기열: 넣은 순서대로 하나씩 만들고 완료로 남긴다", async () => {
  const order = [];
  const q = createQueue({ file: await tmpFile(), run: async (job) => (order.push(job.title), { trackId: job.track.id, ext: "flac" }) });
  await q.load();
  await q.add({ kind: "text2music", title: "첫 곡", track: track(), task: {} });
  await q.add({ kind: "text2music", title: "둘째 곡", track: track("22222222-2222-4222-8222-222222222222"), task: {} });
  await until(() => q.list().every((j) => j.status === "done"));
  assert.deepEqual(order, ["첫 곡", "둘째 곡"]);
  assert.equal(q.list()[0].result.ext, "flac");
  assert.equal(q.list()[0].task, undefined); // 화면에는 생성 요청 원문을 보내지 않는다
});

test("대기열: 엔진이 준비되지 않았으면 기다렸다가 pump 때 만든다", async () => {
  let ready = false;
  const q = createQueue({ file: await tmpFile(), canRun: () => ready, run: async () => ({}) });
  await q.load();
  await q.add({ kind: "text2music", title: "곡", track: track(), task: {} });
  assert.equal(q.list()[0].status, "queued");
  ready = true;
  await q.pump();
  assert.equal(q.list()[0].status, "done");
});

test("대기열: 실패는 이유를 남기고, 대기 중 취소는 바로 빠진다", async () => {
  let ready = false;
  const q = createQueue({ file: await tmpFile(), canRun: () => ready, run: async () => { throw new Error("가사가 너무 깁니다"); } });
  await q.load();
  const a = await q.add({ kind: "text2music", title: "실패할 곡", track: track(), task: {} });
  const b = await q.add({ kind: "text2music", title: "취소할 곡", track: track("33333333-3333-4333-8333-333333333333"), task: {} });
  assert.equal(await q.cancel(b.id), true);
  ready = true;
  await q.pump();
  assert.equal(q.get(a.id).status, "failed");
  assert.equal(q.get(a.id).error, "가사가 너무 깁니다");
  assert.equal(q.get(b.id).status, "cancelled");
});

test("대기열: 만드는 중 취소하면 기다리기를 멈추고 취소됨", async () => {
  const q = createQueue({
    file: await tmpFile(),
    run: (_job, signal) => new Promise((_r, reject) => signal.addEventListener("abort", () => reject(new Error("abort")))),
  });
  await q.load();
  const j = await q.add({ kind: "text2music", title: "긴 곡", track: track(), task: {} });
  await until(() => q.get(j.id).status === "running");
  await q.cancel(j.id);
  await until(() => !q.get(j.id) || q.get(j.id).status === "cancelled");
  assert.equal(q.get(j.id).status, "cancelled");
});

test("대기열: 엔진을 다시 켜면 진행 중이던 작업은 중단됨, 다시 하기는 새 곡 번호로", async () => {
  const file = await tmpFile();
  await writeFile(file, JSON.stringify({ jobs: [{ id: "j1", kind: "text2music", title: "끊긴 곡", track: track(), task: { prompt: "pop" }, status: "running", stage: "만드는 중" }] }));
  const q = createQueue({ file, canRun: () => false, run: async () => ({}) });
  await q.load();
  assert.equal(q.get("j1").status, "interrupted");
  const saved = JSON.parse(await readFile(file, "utf8"));
  assert.equal(saved.jobs[0].status, "interrupted");
  const again = await q.rerun("j1", "44444444-4444-4444-8444-444444444444");
  assert.equal(again.status, "queued");
  assert.equal(again.track.id, "44444444-4444-4444-8444-444444444444");
  assert.equal(q.get("j1"), null);
  await assert.rejects(() => q.rerun(again.id, "55555555-5555-4555-8555-555555555555"), /다시 할 수 있는/);
});

test("대기열: 기록 표시·끝난 작업 지우기", async () => {
  const q = createQueue({ file: await tmpFile(), run: async () => ({}) });
  await q.load();
  const j = await q.add({ kind: "text2music", title: "곡", track: track(), task: {} });
  await until(() => q.get(j.id).status === "done");
  assert.equal(await q.markRecorded(j.id), true);
  assert.equal(q.get(j.id).recorded, true);
  assert.equal(await q.dismiss(j.id), true);
  assert.equal(q.list().length, 0);
});

test("작업 상태 읽기: 진행·실패·완료", () => {
  assert.deepEqual(parseTaskState({ data: [] }, "t"), { state: "running" });
  assert.equal(parseTaskState({ data: [{ task_id: "t", status: 2 }] }, "t").state, "failed");
  assert.deepEqual(parseTaskState({ data: [{ task_id: "t", status: 1, result: JSON.stringify([{ file: "/v1/audio?path=a.flac" }]) }] }, "t"), { state: "done", file: "/v1/audio?path=a.flac" });
  assert.equal(parseTaskState({ data: [{ task_id: "t", status: 1, result: "[]" }] }, "t").state, "failed");
});

test("실행: 맡기기 → 확인 → 보관함 저장(가짜 음악 엔진)", async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push(url.replace(/^http:\/\/127\.0\.0\.1:\d+/, ""));
    if (url.endsWith("/release_task")) return new Response(JSON.stringify({ data: { task_id: "t1" } }));
    if (url.endsWith("/query_result")) return new Response(JSON.stringify({ data: [{ task_id: "t1", status: 1, result: JSON.stringify([{ file: "/v1/audio?path=x.flac" }]) }] }));
    return new Response(new Uint8Array([1, 2, 3]));
  };
  const saved = [];
  const run = createRunner({ port: 1, key: "k", library: { save: async (...a) => saved.push(a) }, sourceDir: os.tmpdir(), pollMs: 1, fetchImpl });
  const stages = [];
  const r = await run({ kind: "text2music", title: "테스트", track: track(), task: { prompt: "pop" } }, new AbortController().signal, (s) => stages.push(s));
  assert.deepEqual(calls, ["/release_task", "/query_result", "/v1/audio?path=x.flac"]);
  assert.equal(saved[0][0], track().id);
  assert.equal(saved[0][2], "테스트");
  assert.equal(saved[0][3], "flac");
  assert.equal(r.ext, "flac");
  assert.ok(stages.includes("보관함에 저장하는 중"));
});
