// 쿠팡 이미지 규격 판정(외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { extraRejectReason, judgeMain } from "../src/lib/coupang/imageRules.ts";

const img = (width, height, format = "jpeg", bytes = 100000) => ({ format, width, height, bytes });

test("실제 반려된 추가 이미지(세로 5000 초과)는 뺀다", () => {
  assert.match(extraRejectReason(img(780, 12996)), /780×12996/);
  assert.match(extraRejectReason(img(780, 13495)), /780×13495/);
});

test("추가 이미지: 규격 안이면 통과, 작거나 무겁거나 형식이 다르면 뺀다", () => {
  assert.equal(extraRejectReason(img(1000, 1500)), null);
  assert.equal(extraRejectReason(img(500, 5000, "png")), null);
  assert.ok(extraRejectReason(img(499, 800)));
  assert.ok(extraRejectReason(img(800, 800, "webp")));
  assert.ok(extraRejectReason(img(800, 800, "jpeg", 11 * 1048576)));
});

test("대표 이미지: 실제 492×492는 확대해서 보내고, 500 이상은 그대로", () => {
  assert.deepEqual(judgeMain(img(492, 492)), { ok: true, upscale: true });
  assert.deepEqual(judgeMain(img(500, 500)), { ok: true, upscale: false });
  assert.deepEqual(judgeMain(img(5000, 5000)), { ok: true, upscale: false });
});

test("대표 이미지: 정사각형 아님·초과·3MB 초과·형식 오류는 막는다", () => {
  assert.match(judgeMain(img(800, 600)).problem, /정사각형/);
  assert.match(judgeMain(img(5001, 5001)).problem, /5000/);
  assert.match(judgeMain(img(800, 800, "jpeg", 4 * 1048576)).problem, /3MB/);
  assert.match(judgeMain(img(800, 800, "webp")).problem, /JPG/);
});
