// F4(v1.35) 목적별 묶음 저장 — 무료 시험(AI 호출 없음)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BUNDLES, MAX_BUNDLE_ITEMS, bundleFileName, bundleItemLabel, cleanBundle } from "../src/lib/portrait/bundles.ts";

test("기본 묶음 3개는 모두 실제 규격·프로필 항목", () => {
  assert.equal(BUNDLES.length, 3);
  for (const b of BUNDLES) assert.deepEqual(cleanBundle(b.items), b.items, b.id);
});

test("목록 밖·중복·형식 오류는 버리고 최대 12개", () => {
  assert.deepEqual(cleanBundle(["size:resume", "size:resume", "size:없음", "profile:circle", "hack", 3]), ["size:resume", "profile:circle"]);
  assert.equal(cleanBundle(null).length, 0);
  const many = ["size:passport", "size:resume", "size:china-visa", "size:us-visa", "size:canada-passport", "size:uk-passport", "size:india-passport", "size:india-visa", "size:us-passport", "size:sg-passport", "size:vn-evisa", "size:hk-passport", "size:nz-passport"];
  assert.equal(cleanBundle(many).length, MAX_BUNDLE_ITEMS);
});

test("파일 이름과 표시 이름", () => {
  assert.equal(bundleFileName("인물사진", "size:resume"), "인물사진-resume-354x472.jpg");
  assert.equal(bundleFileName("인물사진", "profile:circle"), "인물사진-프로필-circle-1080x1080.png");
  assert.match(bundleItemLabel("profile:square"), /^프로필 정사각/);
});

test("화면: 묶음 저장이 규격 추천 영역·프로필 계산을 쓰고 AI를 부르지 않음", () => {
  const s = readFileSync(new URL("../src/components/studio/Studio.tsx", import.meta.url), "utf8");
  const fn = s.slice(s.indexOf("async function saveBundle"), s.indexOf("async function saveSized() {"));
  assert.match(fn, /recommendSizedCrop\(m, preset/);
  assert.match(fn, /profileCrop\(/);
  assert.doesNotMatch(fn, /fetch\(/);
});

test("미리보기: 취업 묶음은 3장, 크기·형식이 붙는다", async () => {
  const { bundlePreview, BUNDLES } = await import("../src/lib/portrait/bundles.ts");
  const list = bundlePreview(BUNDLES[0].items);
  assert.equal(list.length, 3);
  for (const f of list) assert.match(f.size, /^\d+×\d+$/);
  assert.deepEqual(bundlePreview(["profile:circle"]).map((f) => f.ext), ["png"]);
  assert.deepEqual(bundlePreview(["size:없음", 3]), []);
});

test("v1.36 원본과 비교: 사진 위 끌기(공용 compare-slider 사본)", async () => {
  const { percentAt } = await import("../src/lib/portrait/compare.ts");
  assert.equal(percentAt(150, 100, 200), 25);
  const src = readFileSync(new URL("../src/components/studio/Studio.tsx", import.meta.url), "utf8");
  assert.match(src, /setCmpPos\(percentAt\(e\.clientX, r\.left, r\.width\)\)/);
  assert.match(src, /" cmp-on"/);
});
