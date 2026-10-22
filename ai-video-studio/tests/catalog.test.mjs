import test from "node:test";
import assert from "node:assert/strict";
import { MODELS, PROVIDERS, clampSeconds, estCostUsd, findModel } from "../lib/providers/catalog.ts";
import { VIDEO_MODELS } from "../lib/video/videoModels.ts";

test("모델 목록은 공용 기준 VIDEO_MODELS와 같다(단가·길이 한 곳에서 관리)", () => {
  assert.equal(MODELS.length, VIDEO_MODELS.length);
  for (const m of MODELS) assert.ok(PROVIDERS[m.provider], `공급자 정보 없음: ${m.provider}`);
});

test("Gemini만 글만으로 생성, 나머지는 시작 사진 필요", () => {
  const g = findModel("gemini-omni-1.1-flash");
  assert.equal(g.needsImage, false);
  assert.deepEqual(g.aspects, ["16:9", "9:16"]);
  for (const m of MODELS.filter((x) => x.provider !== "gemini")) assert.equal(m.needsImage, true, m.id);
});

test("비율 선택: Gemini·Seedance만, Kling은 사진 비율을 따름", () => {
  assert.deepEqual(findModel("fal-ai/bytedance/seedance/v1.5/pro/image-to-video").aspects, ["16:9", "9:16"]);
  assert.deepEqual(findModel("kwaivgi/kling-v2.1").aspects, []);
});

test("길이: 모델이 받는 값만, 아니면 첫 값", () => {
  const k = findModel("kwaivgi/kling-v2.1");
  assert.equal(clampSeconds(k, 10), 10);
  assert.equal(clampSeconds(k, 8), 5);
  assert.equal(clampSeconds(k, "10"), 5);
});

test("예상 비용: 초당 단가 × 길이, 끝 장면 단가 따로", () => {
  assert.equal(estCostUsd(findModel("gemini-omni-1.1-flash"), 5, false), 0.5);
  assert.equal(estCostUsd(findModel("kwaivgi/kling-v2.1"), 5, true), 0.45);
  assert.equal(estCostUsd(findModel("kwaivgi/kling-v2.1"), 5, false), 0.25);
});

test("모르는 모델은 찾지 않는다", () => {
  assert.equal(findModel("veo-3.1-generate-preview"), undefined);
  assert.equal(findModel(undefined), undefined);
});
