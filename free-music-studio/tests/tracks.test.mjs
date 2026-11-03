import test from "node:test";
import assert from "node:assert/strict";
import { parseTrackInput } from "../src/lib/tracks.ts";

const id = "3f2b8c1e-1a2b-4c3d-8e9f-0123456789ab";
const ok = { id, song_id: null, title: " 비 오는 오후 ", style_prompt: "city pop", lyrics: "[Verse]\r\n창가", duration_sec: 30, device: "cpu" };

test("곡 기록: 정상 입력은 다듬어 통과", () => {
  const r = parseTrackInput(ok);
  assert.equal(r.ok, true);
  assert.equal(r.value.title, "비 오는 오후");
  assert.equal(r.value.lyrics, "[Verse]\n창가");
  assert.equal(r.value.song_id, null);
});

test("곡 기록: 사용 범위 — 기본 상업용, 비상업용(YuE2)은 새 곡 만들기만", () => {
  assert.equal(parseTrackInput(ok).value.license, "commercial");
  assert.equal(parseTrackInput({ ...ok, license: "noncommercial" }).value.license, "noncommercial");
  assert.equal(parseTrackInput({ ...ok, license: "free" }).ok, false);
  assert.equal(parseTrackInput({ ...ok, license: "noncommercial", kind: "cover", duration_sec: 120 }).ok, false);
});

test("곡 기록: 제목이 비면 「제목 없는 노래」", () => {
  assert.equal(parseTrackInput({ ...ok, title: "  " }).value.title, "제목 없는 노래");
});

test("곡 기록: 곡 번호·초안 번호는 uuid만(엔진 파일 이름과 같아야 함)", () => {
  assert.equal(parseTrackInput({ ...ok, id: "../x" }).ok, false);
  assert.equal(parseTrackInput({ ...ok, song_id: "abc" }).ok, false);
  assert.equal(parseTrackInput({ ...ok, song_id: id }).value.song_id, id);
});

test("곡 기록: 종류 — 기본은 노래 만들기, 커버·부분 수정은 원곡 길이 10~600초", () => {
  assert.equal(parseTrackInput(ok).value.kind, "text2music");
  assert.equal(parseTrackInput({ ...ok, kind: "cover", duration_sec: 205 }).ok, true);
  assert.equal(parseTrackInput({ ...ok, kind: "repaint", duration_sec: 9 }).ok, false);
  assert.equal(parseTrackInput({ ...ok, kind: "cover", duration_sec: 601 }).ok, false);
  assert.equal(parseTrackInput({ ...ok, kind: "cover", duration_sec: 20.5 }).ok, false);
  assert.equal(parseTrackInput({ ...ok, kind: "text2music", duration_sec: 205 }).ok, false);
  assert.equal(parseTrackInput({ ...ok, kind: "remix" }).ok, false);
});

test("곡 기록: 길이·장치는 정해진 값만", () => {
  assert.equal(parseTrackInput({ ...ok, duration_sec: 45 }).ok, false);
  assert.equal(parseTrackInput({ ...ok, device: "xpu" }).ok, false);
  assert.equal(parseTrackInput(null).ok, false);
});
