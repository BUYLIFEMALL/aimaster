// v1.23 AI 동영상 — 순수 함수 시험(유료 호출 없음). 실행: node --test tests/ (Node 24 TypeScript 바로 실행)
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_VIDEO_MODEL, findVideoModel, motionPrompt, pickSeconds, priceLabel, sceneCost, VIDEO_MODELS, wonLabel } from "../src/lib/videoModels.ts";
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

test("v1.25 영상 길이: 장면에 맞춤·고정·모델 제한", () => {
  const gem = findVideoModel(DEFAULT_VIDEO_MODEL)!;
  const kling21 = findVideoModel("kwaivgi/kling-v2.1")!;
  assert.equal(pickSeconds(gem, "fit", 4.2), 5);
  assert.equal(pickSeconds(gem, "fit", 5.03), 5); // 0.05초 여유
  assert.equal(pickSeconds(gem, "fit", 6.5), 8);
  assert.equal(pickSeconds(gem, "fit", 9.1), 10);
  assert.equal(pickSeconds(gem, "fit", 14), 10); // 최대보다 길면 최대(그 뒤는 반복)
  assert.equal(pickSeconds(gem, "fit", undefined), 5);
  assert.equal(pickSeconds(kling21, "fit", 6.5), 10); // 5·10초만
  assert.equal(pickSeconds(kling21, 8), 10); // 못 받는 길이는 가장 가까운 값(8 → 10이 5보다 가까움)
  assert.equal(pickSeconds(gem, 8), 8);
  assert.equal(sceneCost(gem, false, 8), 0.8);
  assert.equal(sceneCost(kling21, true, 10), 0.9);
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

// v1.26 ElevenLabs 목소리 설정 정리(목소리 번호 보존·빠르기 0.7~1.2)
import { normalizeAudio, isElevenVoiceId } from "../src/lib/voice.ts";
test("v1.26 ElevenLabs 음성 설정", () => {
  const a = normalizeAudio({ model: "eleven_multilingual_v2", voice: "21m00Tcm4TlvDq8ikWAM", speed: 1.5 } as never);
  assert.equal(a.provider, "elevenlabs");
  assert.equal(a.voice, "21m00Tcm4TlvDq8ikWAM");
  assert.equal(a.speed, 1.2);
  assert.equal(normalizeAudio({ model: "eleven_flash_v2_5", voice: "nova" } as never).voice, ""); // OpenAI 목소리 이름은 버림
  assert.equal(normalizeAudio({ model: "eleven_flash_v2_5" } as never).speed, 1);
  assert.equal(normalizeAudio({ model: "gpt-4o-mini-tts", voice: "nova", speed: 1.4 } as never).voice, "nova"); // 기존 동작 유지
  assert.ok(isElevenVoiceId("21m00Tcm4TlvDq8ikWAM"));
  assert.ok(!isElevenVoiceId("../x"));
});

// v1.27 단어 단위 자막 — 시각 맞추기(유료 호출 없음)
import { startsFromChars, startsFromWords, timedCaptionChunks, tokensOf, captionChunks } from "../src/lib/voice.ts";
test("v1.27 ElevenLabs 글자 시각 → 대본 낱말 시각", () => {
  const text = "물을 마시면 군것질이 줄어요.";
  const chars = [...text]; const starts = chars.map((_, i) => i * 0.1);
  assert.deepEqual(startsFromChars(text, chars, starts), [0, 0.3, 0.7, 1.2]);
  assert.equal(startsFromChars(text, [], []), null);
});
test("v1.27 Whisper 낱말 → 대본 낱말 시각(받아쓴 글자가 달라도 비율로 맞춤)", () => {
  const text = "하루 2리터 물이 AI 시대 건강 비결";
  const w = [{ word: "하루", start: 0 }, { word: "이리터", start: 0.5 }, { word: "물이", start: 1.2 }, { word: "에이아이", start: 1.6 }, { word: "시대", start: 2.4 }, { word: "건강", start: 2.9 }, { word: "비결", start: 3.4 }];
  const s = startsFromWords(text, w)!;
  assert.equal(s.length, tokensOf(text).length);
  assert.equal(s[0], 0);
  for (let i = 1; i < s.length; i++) assert.ok(s[i] >= s[i - 1]); // 시각은 줄어들지 않음
  assert.ok(s[s.length - 1] > 2.5 && s[s.length - 1] <= 3.4);
});
test("v1.27 시각 있는 자막 조각: 나누는 규칙은 기존과 같고 시작 시각은 첫 낱말", () => {
  const text = "배가 고플 때 사실은 목이 마른 신호일 수 있어요. 그때 물을 마시면 군것질이 줄어들죠.";
  const starts = tokensOf(text).map((_, i) => i * 0.5);
  const timed = timedCaptionChunks(text, starts)!;
  assert.deepEqual(timed.map((c) => c.text), captionChunks(text));
  assert.equal(timed[0].start, 0);
  assert.ok(timed[1].start > 0);
  assert.equal(timedCaptionChunks(text, [1, 2]), null); // 낱말 수가 다르면 사용 안 함
});
