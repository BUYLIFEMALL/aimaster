// v1.15 이미지 모델 순서 — 공용 사본(기준 ai-image-studio)에서 가져오고, 빠른 모델 실패 시 4배 비싼 Pro로 넘어가지 않는다(무료 시험)
import test from "node:test";
import assert from "node:assert/strict";
import { IMAGE_MODELS, supportsImageSize } from "../src/lib/imageModelChain.ts";
import { NANO_BANANA_MODEL_CONFIGS } from "../src/lib/nanoBananaModels.ts";

test("모델 이름이 기준 표와 같다", () => {
  assert.deepEqual(IMAGE_MODELS.flash, [NANO_BANANA_MODEL_CONFIGS.nanobanana.modelName, NANO_BANANA_MODEL_CONFIGS["nanobanana-2-2k"].modelName]);
  assert.deepEqual(IMAGE_MODELS.pro, [NANO_BANANA_MODEL_CONFIGS["nanobanana-pro"].modelName, NANO_BANANA_MODEL_CONFIGS["nanobanana-2-2k"].modelName]);
});

test("빠른 등급은 Pro 모델로 넘어가지 않는다(비용)", () => {
  assert.ok(!IMAGE_MODELS.flash.includes(NANO_BANANA_MODEL_CONFIGS["nanobanana-pro"].modelName));
});

test("해상도는 받는 모델에만(Lite는 1K만)", () => {
  assert.equal(supportsImageSize("gemini-3.1-flash-lite-image", "2K"), false);
  assert.equal(supportsImageSize("gemini-nano-banana-2.1", "4K"), true);
  assert.equal(supportsImageSize("gemini-3-pro-image", "2K"), true);
  assert.equal(supportsImageSize("unknown-model", "2K"), false);
});
