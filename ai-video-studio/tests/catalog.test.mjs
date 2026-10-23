import test from "node:test";
import assert from "node:assert/strict";
import { MODELS, PROVIDERS, clampSeconds, estCostUsd, findModel, pickResolution } from "../lib/providers/catalog.ts";
import { STUDIO_VIDEO_MODELS, VIDEO_MODELS } from "../lib/video/videoModels.ts";
import { falInput } from "../lib/video/videoProviders.ts";

test("모델 목록은 공용 기준 STUDIO_VIDEO_MODELS와 같다(단가·길이 한 곳에서 관리)", () => {
  assert.equal(MODELS.length, STUDIO_VIDEO_MODELS.length);
  assert.ok(VIDEO_MODELS.length < STUDIO_VIDEO_MODELS.length, "최신 모델은 다른 프로그램 목록(VIDEO_MODELS)에 넣지 않는다");
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

const U = "https://x.supabase.co/s.jpg", E = "https://x.supabase.co/e.jpg";
test("fal 최신 모델 요청 본문(공식 명세): 사진 칸·길이 형식·소리 끔·비율·해상도", () => {
  const k = falInput(findModel("fal-ai/kling-video/v3/standard/image-to-video").fal, "p", U, E, 5, "16:9");
  assert.deepEqual(k, { prompt: "p", start_image_url: U, duration: "5", end_image_url: E, generate_audio: false });
  const s2 = falInput(findModel("bytedance/seedance-2.0/image-to-video").fal, "p", U, undefined, 4, "9:16", "480p");
  assert.deepEqual(s2, { prompt: "p", image_url: U, duration: "4", generate_audio: false, aspect_ratio: "9:16", resolution: "480p" });
  const v = falInput(findModel("fal-ai/veo3.1/image-to-video").fal, "p", U, undefined, 4, "16:9");
  assert.deepEqual(v, { prompt: "p", image_url: U, duration: "4s", generate_audio: false, aspect_ratio: "16:9", resolution: "720p" });
  const h = falInput(findModel("minimax/h3/image-to-video").fal, "p", U, E, 5, "16:9", "4K");
  assert.deepEqual(h, { prompt: "p", image_url: U, duration: 5, end_image_url: E, resolution: "768P" }, "목록에 없는 해상도는 기본값");
  const w = falInput(findModel("alibaba/wan-3.0/image-to-video").fal, "p", U, undefined, 5, "16:9", "480p");
  assert.deepEqual(w, { prompt: "p", start_image_url: U, duration: 5, audio: false, aspect_ratio: "16:9", resolution: "480p" });
});

test("최신 모델: 해상도·비율·끝 장면·해상도별 비용", () => {
  const w = findModel("alibaba/wan-3.0/image-to-video");
  assert.deepEqual(w.resolutions, ["720p", "480p", "1080p"]);
  assert.equal(pickResolution(w, "480p"), "480p");
  assert.equal(pickResolution(w, "4k"), "720p");
  assert.equal(estCostUsd(w, 5, false, "480p"), 0.25);
  assert.equal(estCostUsd(w, 5, false, "720p"), 0.5);
  assert.deepEqual(findModel("minimax/h3/image-to-video").aspects, []);
  assert.equal(findModel("fal-ai/veo3.1/image-to-video").endFrame, false);
  assert.equal(pickResolution(findModel("fal-ai/kling-video/v3/standard/image-to-video"), "720p"), null);
  assert.equal(estCostUsd(findModel("fal-ai/kling-video/v3/standard/image-to-video"), 5, true), 0.42);
});
