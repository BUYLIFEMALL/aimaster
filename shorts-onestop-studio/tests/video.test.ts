// v1.23 AI 동영상 — 순수 함수 시험(유료 호출 없음). 실행: node --test tests/ (Node 24 TypeScript 바로 실행)
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_VIDEO_MODEL, findVideoModel, motionPrompt, priceLabel, sceneCost, VIDEO_MODELS, wonLabel } from "../src/lib/videoModels.ts";
import { falState, findGeminiVideo, geminiState, isFrameUrl, isHost, isJobId, replicateOutputUrl, replicateState } from "../src/lib/videoParse.ts";

test("기본 모델은 Gemini(회원이 이미 가진 키)", () => {
  assert.equal(findVideoModel(DEFAULT_VIDEO_MODEL)?.provider, "gemini");
  assert.equal(findVideoModel("없는-모델"), undefined);
  assert.deepEqual(new Set(VIDEO_MODELS.map((m) => m.provider)), new Set(["gemini", "fal", "replicate"]));
});

test("장면 비용·단가 표시", () => {
  const lite = findVideoModel("bytedance/seedance-1-lite")!;
  assert.equal(sceneCost(lite, false), 0.18);
  assert.equal(priceLabel(lite), "초당 $0.036 · 5초 약 $0.18");
  assert.equal(priceLabel(findVideoModel(DEFAULT_VIDEO_MODEL)!), "초당 $0.10 · 5초 약 $0.50");
  assert.equal(priceLabel(findVideoModel("fal-ai/kling-video/o3/standard/image-to-video")!), "초당 $0.14 · 5초 약 $0.70");
  const kling = findVideoModel("kwaivgi/kling-v2.1")!;
  assert.equal(sceneCost(kling, false), 0.25);
  assert.equal(sceneCost(kling, true), 0.45); // 끝 화면은 pro 단가
  assert.equal(wonLabel(0.5), "약 700원");
});

test("움직임 지시문: 이어 붙이기 여부·글자 금지", () => {
  assert.match(motionPrompt("A cat on a sofa", true), /first frame to the last frame/);
  assert.match(motionPrompt("", false), /natural, subtle motion/);
  assert.match(motionPrompt("x", false), /no text/);
  assert.ok(motionPrompt("a".repeat(2000), false).length < 800);
});

test("Gemini 응답에서 영상 찾기(구조가 달라도)", () => {
  const inline = { id: "abc", status: "completed", steps: [{ type: "thought" }, { type: "model_output", content: [{ type: "text", text: "ok" }, { type: "video", data: "AAAA", mime_type: "video/mp4" }] }] };
  assert.deepEqual(findGeminiVideo(inline), { data: "AAAA", uri: undefined, mime: "video/mp4" });
  assert.equal(findGeminiVideo({ outputs: [{ type: "video", uri: "https://generativelanguage.googleapis.com/v1beta/files/x" }] })?.uri, "https://generativelanguage.googleapis.com/v1beta/files/x");
  assert.equal(findGeminiVideo({ status: "in_progress" }), null);
  assert.equal(geminiState("completed"), "done");
  assert.equal(geminiState("in_progress"), "running");
  assert.equal(geminiState("failed"), "failed");
});

test("fal·Replicate 상태 해석", () => {
  assert.equal(falState("IN_QUEUE"), "running");
  assert.equal(falState("IN_PROGRESS"), "running");
  assert.equal(falState("COMPLETED"), "done");
  assert.equal(falState("WEIRD"), "failed");
  assert.equal(replicateState("starting"), "running");
  assert.equal(replicateState("processing"), "running");
  assert.equal(replicateState("succeeded"), "done");
  assert.equal(replicateState("canceled"), "failed");
  assert.equal(replicateOutputUrl("https://replicate.delivery/a.mp4"), "https://replicate.delivery/a.mp4");
  assert.equal(replicateOutputUrl(["https://replicate.delivery/b.mp4"]), "https://replicate.delivery/b.mp4");
  assert.equal(replicateOutputUrl("http://insecure/x.mp4"), null);
  assert.equal(replicateOutputUrl(null), null);
});

test("키를 실어 보낼 주소는 공식 호스트만", () => {
  assert.ok(isHost("https://queue.fal.run/fal-ai/x/requests/1/status", ["queue.fal.run"]));
  assert.ok(!isHost("https://evil.example/queue.fal.run", ["queue.fal.run"]));
  assert.ok(!isHost("http://queue.fal.run/x", ["queue.fal.run"]));
  assert.ok(!isHost(123, ["queue.fal.run"]));
});

test("시작·끝 화면 주소 검사(서버가 대신 불러오는 주소 제한)", () => {
  const h = "abc.supabase.co";
  assert.ok(isFrameUrl("https://abc.supabase.co/storage/v1/object/sign/shorts-onestop-studio/u/1.png?token=x", h));
  assert.ok(!isFrameUrl("https://abc.supabase.co/rest/v1/profiles", h));
  assert.ok(isFrameUrl("https://images.pexels.com/photos/1/a.jpeg", h));
  assert.ok(isFrameUrl("https://pixabay.com/get/abc.jpg", h));
  assert.ok(!isFrameUrl("https://169.254.169.254/latest", h));
  assert.ok(!isFrameUrl("http://images.pexels.com/a.jpg", h));
});

test("작업 번호 형식", () => {
  assert.ok(isJobId("abc123-def"));
  assert.ok(isJobId("interactions/abc123"));
  assert.ok(!isJobId("../../etc"));
  assert.ok(!isJobId("a b"));
  assert.ok(!isJobId(""));
});
