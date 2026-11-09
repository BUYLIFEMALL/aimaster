import test from "node:test";
import assert from "node:assert/strict";
import { isOrphanUpload, ORPHAN_MIN_AGE_MS } from "../lib/uploadOrphans.ts";

const ID = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d";
const NOW = Date.parse("2026-11-10T12:00:00Z");
const old = new Date(NOW - ORPHAN_MIN_AGE_MS - 1000).toISOString();
const fresh = new Date(NOW - 3_600_000).toISOString();

test("멈춘 올리기 — 줄 없음·video.mp4 하나·하루 지남일 때만 지운다", () => {
  assert.equal(isOrphanUpload(ID, [{ name: "video.mp4", created_at: old }], false, NOW), true);
});

test("지우지 않는 경우 — 줄 있음, 방금 올림, 다른 파일, 파일 여러 개, 폴더 이름이 번호 아님, 날짜 없음", () => {
  assert.equal(isOrphanUpload(ID, [{ name: "video.mp4", created_at: old }], true, NOW), false);
  assert.equal(isOrphanUpload(ID, [{ name: "video.mp4", created_at: fresh }], false, NOW), false);
  assert.equal(isOrphanUpload(ID, [{ name: "output-0.mp4", created_at: old }], false, NOW), false);
  assert.equal(isOrphanUpload(ID, [{ name: "video.mp4", created_at: old }, { name: "voice.mp3", created_at: old }], false, NOW), false);
  assert.equal(isOrphanUpload("edits", [{ name: "video.mp4", created_at: old }], false, NOW), false);
  assert.equal(isOrphanUpload(ID, [{ name: "video.mp4", created_at: null }], false, NOW), false);
  assert.equal(isOrphanUpload(ID, [], false, NOW), false);
});
