// 공용 기준 코드 gemini-image-models 테스트 — 등급별 모델·화질·온도 (2026-10-17 통합)
import test from "node:test";
import assert from "node:assert/strict";
import { NANO_BANANA_MODEL_CONFIGS, NANO_BANANA_MODEL_OPTIONS, getNanoBananaConfig, resolveImageSize } from "../lib/providers/nanoBananaModels.ts";

test("등급별 값(ai-image-studio v1.11 검증값)", () => {
  assert.equal(getNanoBananaConfig("nanobanana").modelName, "gemini-3.1-flash-lite-image");
  assert.equal(getNanoBananaConfig("nanobanana").imageSize, "1K");
  assert.equal(getNanoBananaConfig("nanobanana-2-2k").modelName, "gemini-nano-banana-2.1");
  assert.equal(getNanoBananaConfig("nanobanana-2-4k").imageSize, "4K");
  assert.equal(getNanoBananaConfig("nanobanana-pro").modelName, "gemini-3-pro-image");
  assert.equal(getNanoBananaConfig("nanobanana-pro").temperature, 0.4);
});

test("모르는 등급·옛 등급 이름은 기본(2K)", () => {
  assert.equal(getNanoBananaConfig("nanobanana-2").imageSize, "2K");
  assert.equal(getNanoBananaConfig(undefined).modelName, "gemini-nano-banana-2.1");
});

test("주소에는 키가 없고 공식 v1beta 주소", () => {
  for (const c of Object.values(NANO_BANANA_MODEL_CONFIGS)) {
    assert.equal(c.endpoint, `https://generativelanguage.googleapis.com/v1beta/models/${c.modelName}:generateContent`);
    assert.ok((c.sizes).includes(c.imageSize));
  }
});

test("화질 맞추기: 받지 않는 화질은 기본 화질로", () => {
  assert.equal(resolveImageSize(getNanoBananaConfig("nanobanana"), "2K"), "1K");
  assert.equal(resolveImageSize(getNanoBananaConfig("nanobanana-2-2k"), "4K"), "4K");
  assert.equal(resolveImageSize(getNanoBananaConfig("nanobanana-pro")), "4K");
  assert.equal(NANO_BANANA_MODEL_OPTIONS.length, 4);
});
