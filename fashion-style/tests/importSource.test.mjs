// v1.12 AI 인물사진 → 「이 사진으로 코디」 받기 판단(무료 시험)
import test from "node:test";
import assert from "node:assert/strict";
import { acceptsPortraitImport } from "../src/lib/look/importSource.ts";

const SB = "https://esgxyikcnnvmlhygjkth.supabase.co";
test("인물사진 버킷 서명 주소만 받는다", () => {
  assert.equal(acceptsPortraitImport(`${SB}/storage/v1/object/sign/portrait-photo-files/u/a.jpg?token=t`, SB), true);
  assert.equal(acceptsPortraitImport(`${SB}/storage/v1/object/sign/banana-canvas-files/u/a.jpg?token=t`, SB), false);
  assert.equal(acceptsPortraitImport(`${SB}/storage/v1/object/public/portrait-photo-files/u/a.jpg`, SB), false);
  assert.equal(acceptsPortraitImport("https://evil.example.com/storage/v1/object/sign/portrait-photo-files/u/a.jpg", SB), false);
  assert.equal(acceptsPortraitImport("nope", SB), false);
});
