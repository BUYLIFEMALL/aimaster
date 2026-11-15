// 실행: node --test lib/productVideo.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { WEBP_LADDER, WEBP_MAX_BYTES, frameAt, groupByCode, motionFor, motionTransform, nextWebpIndex, safeName, totalSeconds, transitionFor, webpArgs, withCode } from "./productVideo.ts";

test("템포별 전체 길이: 6장 기준 약 11·15·22초", () => {
  assert.equal(totalSeconds(6, "fast"), 10.8);
  assert.equal(totalSeconds(6, "normal"), 15);
  assert.equal(Math.round(totalSeconds(6, "slow")), 22);
});

test("사진 경계 직전에만 넘김이 진행되고 마지막 사진은 넘기지 않는다", () => {
  assert.deepEqual(frameAt(0, 3, "normal"), { i: 0, u: 0, k: null });
  const near = frameAt(2.5 - 0.1, 3, "normal");
  assert.equal(near.i, 0); assert.ok(near.k !== null && near.k > 0.7);
  assert.equal(frameAt(2.5, 3, "normal").i, 1);
  assert.equal(frameAt(7.4, 3, "normal").k, null);
  assert.equal(frameAt(99, 3, "normal").i, 2);
});

test("자동 움직임·전환은 차례로 바뀌고, 고르면 그대로", () => {
  assert.notEqual(motionFor(0, "auto"), motionFor(1, "auto"));
  assert.equal(motionFor(3, "hold"), "hold");
  assert.notEqual(transitionFor(0, "auto"), transitionFor(1, "auto"));
  assert.equal(transitionFor(5, "cut"), "cut");
});

test("확대는 12%를 넘지 않는다", () => {
  for (const m of ["zoomIn", "zoomOut", "panRight", "panLeft", "rise", "hold"] as const)
    for (const u of [0, 0.5, 1]) assert.ok(motionTransform(m, u).scale <= 1.12 + 1e-9);
});

test("파일 이름 상품코드_1~6 묶기(번호 순·겹침·규칙 밖 제외)", () => {
  const files = ["B200_2.jpg", "A100_1.png", "B200_1.JPG", "A100_3.webp", "A100_3.jpg", "메모.txt", "A100_7.jpg", "C-9_1.jpeg"].map((name) => ({ name }));
  const { groups, skipped } = groupByCode(files);
  assert.deepEqual(groups.map((g) => [g.code, g.files.map((f) => f.name)]), [
    ["A100", ["A100_1.png", "A100_3.webp"]],
    ["B200", ["B200_1.JPG", "B200_2.jpg"]],
    ["C-9", ["C-9_1.jpeg"]],
  ]);
  assert.deepEqual(skipped.sort(), ["A100_3.jpg", "A100_7.jpg", "메모.txt"].sort());
});

test("{상품코드} 바꾸기와 안전한 파일 이름", () => {
  assert.equal(withCode("{상품코드} 신상품", "A100"), "A100 신상품");
  assert.equal(safeName('a/b:c*"', "mp4"), "abc.mp4");
  assert.equal(safeName("   ", "webp"), "product.webp");
});

test("WebP 단계: 상한 안이면 그대로, 넘으면 다음, 두 배 넘으면 두 칸, 끝이면 -1", () => {
  assert.equal(nextWebpIndex(0, WEBP_MAX_BYTES), 0);
  assert.equal(nextWebpIndex(0, WEBP_MAX_BYTES + 1), 1);
  assert.equal(nextWebpIndex(0, WEBP_MAX_BYTES * 3), 2);
  assert.equal(nextWebpIndex(WEBP_LADDER.length - 1, WEBP_MAX_BYTES * 3), -1);
  assert.equal(nextWebpIndex(WEBP_LADDER.length - 2, WEBP_MAX_BYTES * 3), WEBP_LADDER.length - 1);
});

test("WebP ffmpeg 인자: 가로 짝수·무한 반복·소리 없음", () => {
  const a = webpArgs("in.mp4", "out.webp", 1080, { scale: 0.85, quality: 60, fps: 15 });
  assert.ok(a.includes("libwebp_anim") && a.includes("-an"));
  assert.equal(a[a.indexOf("-vf") + 1], "fps=15,scale=918:-2:flags=lanczos");
  assert.equal(a[a.indexOf("-loop") + 1], "0");
});

test("모든 크기는 H.264가 받는 짝수", async () => {
  const { RATIOS } = await import("./productVideo.ts");
  for (const r of Object.values(RATIOS)) { assert.equal(r.w % 2, 0); assert.equal(r.h % 2, 0); }
});
