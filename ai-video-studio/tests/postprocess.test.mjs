import test from "node:test";
import assert from "node:assert/strict";
import { isUploadModel, postBlocked, postCostUsd, postInput, postKindOf, postModelId, sourceHeight, uploadAspect, uploadSeconds, upscaleFactor, videoSize, UPLOAD_MODEL } from "../lib/postprocess.ts";

test("후처리 모델 이름 — post:<종류>만 후처리로 본다", () => {
  assert.equal(postKindOf(postModelId("lipsync")), "lipsync");
  assert.equal(postKindOf("post:unknown"), null);
  assert.equal(postKindOf("fal-ai/kling-video/o3/standard/image-to-video"), null);
});

test("예상 비용 — 립싱크는 5초마다(올림), 업스케일 초당 0.02, 배경 제거 초당 0.14", () => {
  assert.equal(postCostUsd("lipsync", 5), 0.014);
  assert.equal(postCostUsd("lipsync", 7), 0.028);
  assert.equal(postCostUsd("upscale", 5), 0.1);
  assert.equal(postCostUsd("bgremove", 5), 0.7);
});

test("할 수 없는 경우 — 립싱크 10초 넘음, 배경 제거 30초 이상, 이미 1080p 업스케일", () => {
  assert.match(postBlocked("lipsync", 12), /10초 이하/);
  assert.equal(postBlocked("lipsync", 8), null);
  assert.match(postBlocked("bgremove", 30), /29초 이하/);
  assert.match(postBlocked("upscale", 5, "1080p"), /1080p/);
  assert.equal(postBlocked("upscale", 5, "720p"), null);
  assert.equal(postBlocked("upscale", 5), null);
});

test("fal 입력 — 업스케일은 결과가 1080p가 되는 배율·H264, 배경 제거는 MP4·소리 유지", () => {
  assert.equal(sourceHeight("480p"), 480);
  assert.deepEqual(postInput("upscale", { videoUrl: "v", resolution: "720p" }), { video_url: "v", upscale_factor: 1.5, H264_output: true });
  assert.equal(postInput("upscale", { videoUrl: "v", resolution: "480p" }).upscale_factor, 2.25);
  assert.deepEqual(postInput("bgremove", { videoUrl: "v", color: "White" }), { video_url: "v", background_color: "White", output_container_and_codec: "mp4_h264", preserve_audio: true });
  assert.deepEqual(postInput("lipsync", { videoUrl: "v", audioUrl: "a" }), { video_url: "v", audio_url: "a" });
});

test("업스케일 배율 — 실제 크기가 있으면 결과를 1920×1080(세로 1080×1920) 안으로 맞춘다", () => {
  assert.equal(upscaleFactor("720p", { w: 1280, h: 720 }), 1.5);
  assert.equal(upscaleFactor("720p", { w: 720, h: 1280 }), 1.5);
  // 세로로 긴 립싱크 결과 720×1440 — 짧은 쪽만 보면 1.5(1080×2160, 1080p 넘는 단가)
  const f = upscaleFactor("720p", { w: 720, h: 1440 });
  assert.equal(f, 1.33);
  assert.ok(Math.round(1440 * f) <= 1920);
  assert.equal(upscaleFactor("720p", { w: 1080, h: 1080 }), 1);
  assert.match(postBlocked("upscale", 5, "720p", { w: 1080, h: 1080 }), /1080p/);
  assert.match(postBlocked("upscale", 5, "720p", { w: 1920, h: 1080 }), /1080p/);
  assert.equal(postBlocked("upscale", 5, "720p", { w: 720, h: 1440 }), null);
  assert.equal(postInput("upscale", { videoUrl: "v", resolution: "720p", size: { w: 720, h: 1440 } }).upscale_factor, 1.33);
  assert.equal(videoSize({ w: 720, h: 1440 }).h, 1440);
  assert.equal(videoSize({ w: 0, h: 1440 }), null);
  assert.equal(videoSize("x"), null);
  assert.equal(videoSize({ w: 7.5, h: 10 }), null);
});

test("내 영상 올리기 — 길이는 올림(립싱크 10초 제한을 미리 막음), 비율은 9:16·16:9에 가까울 때만", () => {
  assert.equal(uploadSeconds(10.0), 10);
  assert.equal(uploadSeconds(10.04), 10);
  assert.equal(uploadSeconds(10.4), 11);
  assert.equal(uploadSeconds(0.3), 1);
  assert.equal(postBlocked("lipsync", uploadSeconds(10.4)) !== null, true);
  assert.equal(uploadAspect(1920, 1080), "16:9");
  assert.equal(uploadAspect(1080, 1920), "9:16");
  assert.equal(uploadAspect(1080, 1080), null);
  assert.equal(uploadAspect(0, 0), null);
  assert.equal(isUploadModel(UPLOAD_MODEL), true);
  assert.equal(postKindOf(UPLOAD_MODEL), null);
});
