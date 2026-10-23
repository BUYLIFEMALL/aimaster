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

test("Gemini와 글→영상 주소가 있는 fal 모델만 글만으로 생성, 나머지는 시작 사진 필요(v1.08)", () => {
  const g = findModel("gemini-omni-1.1-flash");
  assert.equal(g.needsImage, false);
  assert.deepEqual(g.aspects, ["16:9", "9:16"]);
  for (const m of MODELS.filter((x) => x.provider !== "gemini")) assert.equal(m.needsImage, !m.fal?.t2v, m.id);
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

test("v1.08 소리 켜기·글만으로 만들기(fal 글→영상 주소)", async () => {
  const { estCostUsd, MODELS } = await import("../lib/providers/catalog.ts");
  const { submitVideoJob } = await import("../lib/video/videoProviders.ts");
  const U = "https://example.com/a.png";
  // 소리를 켜면 소리 칸이 true
  assert.equal(falInput(findModel("alibaba/wan-3.0/image-to-video").fal, "p", U, undefined, 5, "16:9", "480p", true).audio, true);
  assert.equal(falInput(findModel("fal-ai/veo3.1/image-to-video").fal, "p", U, undefined, 4, "16:9", undefined, true).generate_audio, true);
  // 사진 없이(글만으로): 사진 칸·끝 화면 없이 비율 칸을 보낸다
  const kt = falInput(findModel("fal-ai/kling-video/v3/standard/image-to-video").fal, "p", undefined, "https://example.com/e.png", 5, "9:16");
  assert.deepEqual(kt, { prompt: "p", aspect_ratio: "9:16", duration: "5", generate_audio: false });
  const wt = falInput(findModel("alibaba/wan-3.0/image-to-video").fal, "p", undefined, undefined, 5, "16:9", "480p", true);
  assert.deepEqual(wt, { prompt: "p", aspect_ratio: "16:9", duration: 5, audio: true, resolution: "480p" });
  // 글→영상 주소가 있는 fal 모델은 사진이 필요 없고, 소리를 고를 수 있다
  for (const id of ["fal-ai/kling-video/v3/standard/image-to-video", "bytedance/seedance-2.0/image-to-video", "fal-ai/veo3.1/image-to-video", "alibaba/wan-3.0/image-to-video"]) {
    const m = findModel(id);
    assert.equal(m.needsImage, false, id);
    assert.equal(m.audioOption, true, id);
    assert.deepEqual(m.aspects, ["16:9", "9:16"], id);
  }
  assert.equal(findModel("minimax/h3/image-to-video").needsImage, true);
  assert.ok(MODELS.filter((m) => !m.audioOption).length > 0);
  // 소리 단가: Kling 3.0 0.084 → 0.126, Veo 0.2 → 0.4, Wan은 같음
  const k = findModel("fal-ai/kling-video/v3/standard/image-to-video");
  assert.equal(estCostUsd(k, 5, false, null), 0.42);
  assert.equal(estCostUsd(k, 5, false, null, true), 0.63);
  assert.equal(estCostUsd(findModel("fal-ai/veo3.1/image-to-video"), 4, false, "720p", true), 1.6);
  const w = findModel("alibaba/wan-3.0/image-to-video");
  assert.equal(estCostUsd(w, 5, false, "480p", true), estCostUsd(w, 5, false, "480p"));
  // 제출: 사진 없으면 글→영상 주소로 보낸다(요청만 확인, 실제 호출 없음)
  const seen = [];
  const orig = globalThis.fetch;
  globalThis.fetch = async (url, init) => { seen.push({ url: String(url), body: JSON.parse(init.body) }); return new Response(JSON.stringify({ request_id: "abc-123", status_url: "https://queue.fal.run/x/requests/abc-123/status", response_url: "https://queue.fal.run/x/requests/abc-123" }), { status: 200 }); };
  try {
    await submitVideoJob({ key: "k", model: w, prompt: "p", seconds: 5, aspectRatio: "16:9", resolution: "480p", audio: true });
    await submitVideoJob({ key: "k", model: w, prompt: "p", startUrl: U, seconds: 5, aspectRatio: "16:9", resolution: "480p" });
  } finally { globalThis.fetch = orig; }
  assert.equal(seen[0].url, "https://queue.fal.run/alibaba/wan-3.0/text-to-video");
  assert.equal(seen[0].body.audio, true);
  assert.equal(seen[0].body.start_image_url, undefined);
  assert.equal(seen[1].url, "https://queue.fal.run/alibaba/wan-3.0/image-to-video");
  assert.equal(seen[1].body.audio, false);
  // 글→영상 주소가 없는 fal 모델은 여전히 사진이 필요
  await assert.rejects(submitVideoJob({ key: "k", model: findModel("minimax/h3/image-to-video"), prompt: "p", seconds: 5 }), /시작 장면 사진/);
});
