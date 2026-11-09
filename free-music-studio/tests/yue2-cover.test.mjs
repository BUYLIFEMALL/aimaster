// YuE2 커버(엔진 0.8.0, 백로그 B-5) — 사이트 쪽: 기능 판단과 대기열 요청의 engine 칸
import test from "node:test";
import assert from "node:assert/strict";
import { enqueueEdit, hasYue2Cover } from "../src/lib/engine.ts";

test("hasYue2Cover — 엔진이 yue2cover 기능을 알릴 때만", () => {
  assert.equal(hasYue2Cover(null), false);
  assert.equal(hasYue2Cover({ features: ["cover", "queue"] }), false);
  assert.equal(hasYue2Cover({ features: ["cover", "yue2cover"] }), true);
});

const captureMeta = async (engine) => {
  const realFetch = globalThis.fetch;
  let meta = null;
  globalThis.fetch = async (url, init) => {
    meta = JSON.parse(String(init.body.get("meta")));
    return new Response(JSON.stringify({ job: { id: "j1" } }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const file = new File([new Uint8Array([1, 2, 3])], "src.mp3", { type: "audio/mpeg" });
    await enqueueEdit(file, { mode: "cover", style_prompt: "jazz", lyrics: "[verse]\n새 가사", strength: 0.6 }, 120, { title: "커버", device: "cuda", engine });
  } finally {
    globalThis.fetch = realFetch;
  }
  return meta;
};

test("enqueueEdit — YuE2 커버면 meta.engine = yue2, ACE-Step이면 engine 칸 없음(옛 엔진 호환)", async () => {
  const y = await captureMeta("yue2");
  assert.equal(y.engine, "yue2");
  assert.equal(y.kind, "cover");
  assert.equal(y.track.lyrics, "[verse]\n새 가사");
  const a = await captureMeta("acestep");
  assert.equal("engine" in a, false);
  const none = await captureMeta(undefined);
  assert.equal("engine" in none, false);
});

// C-33(2026-11-09): 커버를 만들 때 넣을 프로젝트
import { parseTrackInput } from "../src/lib/tracks.ts";

test("곡 기록 — 처음 기록할 때 project_id를 받고, 형식이 틀리면 거절, 없으면 칸을 만들지 않음", () => {
  const base = { id: "11111111-1111-4111-8111-111111111111", title: "커버", style_prompt: "jazz", lyrics: "[verse]\n가사", duration_sec: 120, device: "cuda", kind: "cover", license: "noncommercial" };
  const pid = "22222222-2222-4222-8222-222222222222";
  const ok = parseTrackInput({ ...base, project_id: pid });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.project_id, pid);
  assert.equal(parseTrackInput({ ...base, project_id: "not-a-uuid" }).ok, false);
  assert.equal("project_id" in parseTrackInput(base).value, false);
});

test("enqueueEdit — 넣을 프로젝트를 곡 정보(track.project_id)에 실어 보냄", async () => {
  const realFetch = globalThis.fetch;
  let meta = null;
  globalThis.fetch = async (url, init) => {
    meta = JSON.parse(String(init.body.get("meta")));
    return new Response(JSON.stringify({ job: { id: "j2" } }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const file = new File([new Uint8Array([1])], "a.mp3", { type: "audio/mpeg" });
    await enqueueEdit(file, { mode: "cover", style_prompt: "x", lyrics: "", strength: 0.6 }, 90, { title: "c", device: "cuda", projectId: "22222222-2222-4222-8222-222222222222" });
    assert.equal(meta.track.project_id, "22222222-2222-4222-8222-222222222222");
    await enqueueEdit(file, { mode: "cover", style_prompt: "x", lyrics: "", strength: 0.6 }, 90, { title: "c", device: "cuda" });
    assert.equal("project_id" in meta.track, false);
  } finally {
    globalThis.fetch = realFetch;
  }
});
