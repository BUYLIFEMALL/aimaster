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
  assert.deepEqual(findModel("fal-ai/kling-video/o3/standard/image-to-video").aspects, []);
});

test("길이: 모델이 받는 값만, 아니면 첫 값", () => {
  const k = findModel("minimax/h3/image-to-video"); // 5·10초만(2026-10-24 Kling v2.1 업체 종료로 교체)
  assert.equal(clampSeconds(k, 10), 10);
  assert.equal(clampSeconds(k, 8), 5);
  assert.equal(clampSeconds(k, "10"), 5);
});

test("예상 비용: 초당 단가 × 길이, 끝 장면 단가 따로", () => {
  assert.equal(estCostUsd(findModel("gemini-omni-1.1-flash"), 5, false), 0.5);
  // 끝 장면 단가가 따로 있는 모델(옛 Kling v2.1 값) — 지금 목록에는 없어 시험용 객체로 규칙만 확인
  const withEndRate = { ...findModel("fal-ai/kling-video/o3/standard/image-to-video"), perSec: 0.05, perSecEnd: 0.09 };
  assert.equal(estCostUsd(withEndRate, 5, true), 0.45);
  assert.equal(estCostUsd(withEndRate, 5, false), 0.25);
});

test("2026-10-24 Replicate Kling v2.1은 업체 서비스 종료로 목록에 없다(공용·스튜디오 모두)", () => {
  assert.equal(findModel("kwaivgi/kling-v2.1"), undefined);
  assert.ok(!VIDEO_MODELS.some((m) => m.id === "kwaivgi/kling-v2.1"));
  assert.ok(!MODELS.some((m) => m.id === "kwaivgi/kling-v2.1"));
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

test("v1.13 모델 카드 예시: 목록에 있는 모델은 public/examples에 mp4·jpg가 있고, 목록의 이름은 모두 실제 모델", async () => {
  const { existsSync, statSync } = await import("node:fs");
  const { MODEL_EXAMPLES, exampleSlug } = await import("../lib/providers/catalog.ts");
  const slugs = new Set(MODELS.map((m) => exampleSlug(m.id)));
  assert.ok(MODEL_EXAMPLES.size >= 1);
  for (const s of MODEL_EXAMPLES) {
    assert.ok(slugs.has(s), `모델 목록에 없는 예시: ${s}`);
    for (const ext of ["mp4", "jpg"]) {
      const p = new URL(`../public/examples/${s}.${ext}`, import.meta.url);
      assert.ok(existsSync(p), `파일 없음: ${s}.${ext}`);
      assert.ok(statSync(p).size < 400_000, `예시가 너무 큼: ${s}.${ext}`);
    }
  }
  assert.equal(exampleSlug("fal-ai/veo3.1/image-to-video"), "fal-ai-veo3-1-image-to-video");
});

test("v1.33 Runway·Vidu 직접 연동: 모델·비율·요청 모양·상태 확인·오류 문구(가짜 응답, 실제 호출 없음)", async () => {
  const { submitVideoJob, checkVideoJob, VideoGenError } = await import("../lib/video/videoProviders.ts");
  const { estCostUsd } = await import("../lib/providers/catalog.ts");
  const r = findModel("gen4_turbo"), r45 = findModel("gen4.5"), v = findModel("viduq3-turbo"), vp = findModel("viduq3-pro");
  for (const m of [r, r45, v, vp]) { assert.ok(m, "모델 없음"); assert.equal(m.needsImage, true); assert.equal(m.endFrame, false); assert.equal(m.audioOption, false); }
  assert.deepEqual(r.aspects, ["16:9", "9:16"]);
  assert.deepEqual(v.aspects, [], "Vidu는 사진 비율을 따름");
  assert.equal(estCostUsd(r, 5, false), 0.25);
  assert.equal(estCostUsd(r45, 5, false), 0.6);
  assert.ok(!VIDEO_MODELS.some((m) => m.provider === "runway" || m.provider === "vidu"), "다른 프로그램 목록(사본)에는 넣지 않음");
  const U = "https://example.com/a.png";
  const seen = [];
  let reply = () => new Response("{}", { status: 200 });
  const orig = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => { seen.push({ url: String(url), headers: init.headers ?? {}, body: init.body ? JSON.parse(init.body) : null }); return reply(String(url)); };
  try {
    // 사진 없으면 거절(요청 안 보냄)
    await assert.rejects(submitVideoJob({ key: "k", model: r, prompt: "p", seconds: 5 }), /시작 장면 사진/);
    assert.equal(seen.length, 0);
    // Runway 제출: 세로 720:1280, 끝 장면 무시
    reply = () => new Response(JSON.stringify({ id: "17f20503-6c24-4c16-946b-35dbbce2af2f" }), { status: 200 });
    const a = await submitVideoJob({ key: "rk", model: r, prompt: "p", startUrl: U, endUrl: "https://example.com/e.png", seconds: 5 });
    assert.equal(seen[0].url, "https://api.dev.runwayml.com/v1/image_to_video");
    assert.equal(seen[0].headers.Authorization, "Bearer rk");
    assert.equal(seen[0].headers["X-Runway-Version"], "2024-11-06");
    assert.deepEqual(seen[0].body, { model: "gen4_turbo", promptImage: U, promptText: "p", ratio: "720:1280", duration: 5 });
    assert.equal(a.job.provider, "runway");
    assert.equal(a.job.withEnd, false);
    await submitVideoJob({ key: "rk", model: r45, prompt: "p", startUrl: U, seconds: 10, aspectRatio: "16:9" });
    assert.equal(seen[1].body.ratio, "1280:720");
    // Runway 상태: 진행 중 → 완료(output[0] 받기)
    reply = (u) => u.includes("/v1/tasks/") ? new Response(JSON.stringify({ status: "RUNNING" }), { status: 200 }) : new Response("x");
    assert.deepEqual(await checkVideoJob({ key: "rk", job: a.job }), { state: "running" });
    reply = (u) => u.includes("/v1/tasks/") ? new Response(JSON.stringify({ status: "SUCCEEDED", output: ["https://dnznrvs05pmza.cloudfront.net/v.mp4"] }), { status: 200 }) : new Response(Buffer.alloc(2000), { status: 200 });
    const done = await checkVideoJob({ key: "rk", job: a.job });
    assert.equal(done.state, "done");
    assert.equal(done.bytes.length, 2000);
    assert.equal(seen.at(-1).headers.Authorization, undefined, "결과 주소에는 키를 보내지 않음");
    reply = () => new Response(JSON.stringify({ status: "FAILED", failureCode: "SAFETY.INPUT.IMAGE" }), { status: 200 });
    await assert.rejects(checkVideoJob({ key: "rk", job: a.job }), /안전 정책/);
    // Vidu 제출: Token 인증, 사진 1장, 소리 끔, 720p
    seen.length = 0;
    reply = () => new Response(JSON.stringify({ task_id: "866123456789", state: "created" }), { status: 200 });
    const b = await submitVideoJob({ key: "vk", model: v, prompt: "p", startUrl: U, seconds: 8, aspectRatio: "16:9" });
    assert.equal(seen[0].url, "https://api.vidu.com/ent/v2/img2video");
    assert.equal(seen[0].headers.Authorization, "Token vk");
    assert.deepEqual(seen[0].body, { model: "viduq3-turbo", images: [U], prompt: "p", duration: 8, resolution: "720p", audio: false });
    assert.equal(b.job.id, "866123456789");
    reply = (u) => u.includes("/creations") ? new Response(JSON.stringify({ state: "processing" }), { status: 200 }) : new Response("x");
    assert.deepEqual(await checkVideoJob({ key: "vk", job: b.job }), { state: "running" });
    assert.equal(seen.at(-1).url, "https://api.vidu.com/ent/v2/tasks/866123456789/creations");
    reply = (u) => u.includes("/creations") ? new Response(JSON.stringify({ state: "success", creations: [{ id: "1", url: "https://cdn.vidu.com/v.mp4" }] }), { status: 200 }) : new Response(Buffer.alloc(3000), { status: 200 });
    assert.equal((await checkVideoJob({ key: "vk", job: b.job })).bytes.length, 3000);
    reply = () => new Response(JSON.stringify({ state: "failed", err_code: "CreditInsufficient" }), { status: 200 });
    await assert.rejects(checkVideoJob({ key: "vk", job: b.job }), /크레딧/);
    // 오류 문구: Vidu 글 오류, Runway 401
    reply = () => new Response(JSON.stringify({ reason: "Unauthorized" }), { status: 400 });
    await assert.rejects(submitVideoJob({ key: "vk", model: vp, prompt: "p", startUrl: U, seconds: 5 }), (e) => e instanceof VideoGenError && e.code === "key");
    reply = () => new Response(JSON.stringify({ reason: "CreditInsufficient" }), { status: 400 });
    await assert.rejects(submitVideoJob({ key: "vk", model: vp, prompt: "p", startUrl: U, seconds: 5 }), (e) => e.code === "quota");
    reply = () => new Response("bad key", { status: 401 });
    await assert.rejects(submitVideoJob({ key: "rk", model: r, prompt: "p", startUrl: U, seconds: 5 }), (e) => e.code === "key" && /Runway/.test(e.message));
  } finally { globalThis.fetch = orig; }
});

test("v1.34 만들기 화면이 보내는 값 이름 = 서버가 읽는 이름(v1.28 리뉴얼 때 어긋나 사진·비율이 안 가던 사고 재발 방지)", async () => {
  const { readFileSync } = await import("node:fs");
  const ui = readFileSync(new URL("../components/studio/CreateStudio.tsx", import.meta.url), "utf8");
  const api = readFileSync(new URL("../app/api/generations/route.ts", import.meta.url), "utf8");
  const at = ui.indexOf("reuse: { idea");
  assert.ok(at > 0, "생성 요청 본문을 찾지 못함");
  const sent = ui.slice(at - 600, at + 60);
  for (const k of ["model", "prompt", "seconds", "aspectRatio", "resolution", "audio", "startImage", "endImage", "reuse"]) {
    assert.ok(new RegExp(`\\b${k}\\b`).test(sent), `화면이 ${k}를 보내지 않음`);
    assert.ok(api.includes(`body.${k}`), `서버가 body.${k}를 읽지 않음`);
  }
  assert.ok(!/startImageUrl|endImageUrl/.test(sent), "옛 잘못된 이름");
  assert.ok(/data\.generations/.test(ui) && /generations:/.test(api), "응답은 generations 배열");
  assert.ok(/MODELS\.filter\(\(m\) => m\.provider === providerId\)/.test(ui), "모델 고르기 칸");
});
