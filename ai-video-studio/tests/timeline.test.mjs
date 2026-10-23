import test from "node:test";
import assert from "node:assert/strict";
import { FPS, MAX_CLIPS, captionMaxChars, wrapCaption, clipSeconds, dimensions, fadeOpacity, layout, musicVolume, outputFileName, totalSeconds, validate } from "../lib/edit/timeline.ts";

const clip = (id, duration, trimStart = 0, trimEnd = 0, caption = "") => ({ id, src: `blob:${id}`, name: id, duration, trimStart, trimEnd, caption });
const project = (clips) => ({ clips, aspect: "9:16", quality: "720p", transition: "fade", captionPosition: "bottom", captionStyle: "band", music: null });

test("화면 크기는 비율·화질별로 짝수 해상도", () => {
  assert.deepEqual(dimensions("9:16", "720p"), { width: 720, height: 1280 });
  assert.deepEqual(dimensions("16:9", "1080p"), { width: 1920, height: 1080 });
  assert.deepEqual(dimensions("1:1", "720p"), { width: 720, height: 720 });
});

test("자르기를 반영한 길이, 잘못된 자르기는 최소 0.5초를 남긴다", () => {
  assert.equal(clipSeconds(clip("a", 5, 1, 1)), 3);
  assert.equal(clipSeconds(clip("a", 5, 10, 0)), 0.5);
  assert.equal(clipSeconds(clip("a", 5, 4, 4)), 0.5);
  assert.equal(clipSeconds(clip("a", 5, -2, Number.NaN)), 5);
});

test("클립은 겹치지 않고 순서대로 이어진다", () => {
  const { segments, totalFrames } = layout(project([clip("a", 5, 1, 0), clip("b", 4.04), clip("c", 4, 0, 2)]));
  assert.deepEqual(segments.map((s) => [s.from, s.durationInFrames, s.trimBeforeFrames]), [[0, 120, 30], [120, 121, 0], [241, 60, 0]]);
  assert.equal(totalFrames, 301);
  assert.ok(Math.abs(totalSeconds(project([clip("a", 5, 1, 0), clip("b", 4.04), clip("c", 4, 0, 2)])) - 10.04) < 1e-9);
});

test("페이드는 장면 처음·끝에서만 0으로, 전환 없음이면 항상 1", () => {
  assert.equal(fadeOpacity(0, 120, "fade"), 0);
  assert.equal(fadeOpacity(60, 120, "fade"), 1);
  assert.equal(fadeOpacity(119, 120, "fade"), 0);
  assert.equal(fadeOpacity(0, 120, "none"), 1);
  assert.ok(fadeOpacity(4, 6, "fade") <= 1);
});

test("배경음악은 끝 1초 동안 줄어든다", () => {
  const total = 10 * FPS;
  assert.equal(musicVolume(0, total, 0.8, true), 0.8);
  assert.equal(musicVolume(total - FPS / 2, total, 0.8, true), 0.4);
  assert.equal(musicVolume(total, total, 0.8, true), 0);
  assert.equal(musicVolume(total - 1, total, 0.8, false), 0.8);
  assert.equal(musicVolume(0, total, 3, false), 1);
});

test("렌더 전 검사: 빈 목록·개수·총 길이 제한", () => {
  assert.match(validate(project([])), /1개 이상/);
  assert.match(validate(project(Array.from({ length: MAX_CLIPS + 1 }, (_, i) => clip(`c${i}`, 5)))), /최대 20개/);
  assert.match(validate(project(Array.from({ length: 19 }, (_, i) => clip(`c${i}`, 10)))), /최대 3분/);
  assert.equal(validate(project([clip("a", 5)])), null);
});

test("자막은 띄어쓰기 기준으로 나누고 최대 3줄", () => {
  assert.deepEqual(wrapCaption("레코드판이 천천히 돌아가는 아늑한 홈 스튜디오", captionMaxChars("9:16")), ["레코드판이 천천히 돌아가는", "아늑한 홈 스튜디오"]);
  assert.deepEqual(wrapCaption("가나다라마바사아자차카타파하", 5), ["가나다라마", "바사아자차", "카타파하"]);
  assert.equal(wrapCaption("일 이 삼 사 오 육 칠 팔 구 십", 3).length, 3);
  assert.deepEqual(wrapCaption("   ", 14), []);
});

test("내려받기 이름은 영문", () => {
  assert.equal(outputFileName(new Date(2026, 9, 23, 9, 5)), "ai-video-edit-20261023-0905.mp4");
});

test("내레이션 음성이 있으면 낱말 시각에 맞춰 자막을 나눈다", async () => {
  const { sceneCaptions } = await import("../lib/edit/timeline.ts");
  const c = { ...clip("a", 6), narration: "오늘은 레코드판을 들으며 하루를 마무리합니다. 편안한 밤 되세요", voice: { src: "blob:v", duration: 5, starts: [0, 0.5, 1.2, 1.8, 2.6, 3.3, 3.9, 4.4], mime: "audio/mpeg" } };
  const caps = sceneCaptions(c, 180);
  assert.ok(caps.length >= 2);
  assert.equal(caps[0].from, 0);
  assert.ok(caps.every((x, i) => x.to > x.from && (i === 0 || x.from >= caps[i - 1].from)));
  assert.equal(caps.map((x) => x.text).join(" "), c.narration);
});

test("낱말 시각이 없으면 글자 수 비례, 음성이 없으면 자막 한 줄을 장면 내내", async () => {
  const { sceneCaptions } = await import("../lib/edit/timeline.ts");
  const noStarts = { ...clip("a", 6), narration: "하나 둘 셋 넷 다섯 여섯 일곱 여덟 아홉 열 열하나", voice: { src: "blob:v", duration: 4, starts: null, mime: "audio/mpeg" } };
  const caps = sceneCaptions(noStarts, 180);
  assert.ok(caps.length >= 2 && caps[caps.length - 1].from < 4 * 30);
  assert.deepEqual(sceneCaptions({ ...clip("b", 5, 0, 0, "고정 자막") }, 150), [{ text: "고정 자막", from: 0, to: 150 }]);
  assert.deepEqual(sceneCaptions(clip("c", 5), 150), []);
});

test("내레이션이 장면보다 길면 초과 초를 알려 준다", async () => {
  const { voiceOverflow } = await import("../lib/edit/timeline.ts");
  assert.equal(voiceOverflow({ ...clip("a", 5, 0, 1), voice: { src: "", duration: 5.5, starts: null, mime: "audio/mpeg" } }), 1.5);
  assert.equal(voiceOverflow({ ...clip("a", 5), voice: { src: "", duration: 3, starts: null, mime: "audio/mpeg" } }), 0);
});

test("저장 형식: blob 주소는 빼고, 다른 회원 폴더 음성 경로·잘못된 값은 걸러 낸다", async () => {
  const { toSaved, sanitizeSaved } = await import("../lib/edit/timeline.ts");
  const p = { ...project([{ ...clip("a", 5), source: { kind: "gallery", id: "11111111-2222-3333-4444-555555555555" }, narration: "안녕", voice: { src: "blob:x", duration: 1, starts: [0], mime: "audio/mpeg" } }, clip("b", 4)]), music: { src: "blob:m", name: "곡", volume: 0.5, fadeOut: true, source: { kind: "ams", ref: "11111111-2222-3333-4444-555555555555:0" } } };
  const saved = toSaved(p, { a: "user1/edits/e1/voice-a.mp3" });
  assert.ok(!JSON.stringify(saved).includes("blob:"));
  assert.equal(saved.clips[1].source.kind, "local");
  const ok = sanitizeSaved(saved, "user1/");
  assert.equal(ok.clips[0].voice.path, "user1/edits/e1/voice-a.mp3");
  assert.equal(ok.music.source.kind, "ams");
  const bad = sanitizeSaved({ ...saved, aspect: "4:3", clips: [{ ...saved.clips[0], voice: { ...saved.clips[0].voice, path: "user2/edits/e1/v.mp3" } }] }, "user1/");
  assert.equal(bad.aspect, "9:16");
  assert.equal(bad.clips[0].voice, null);
  assert.equal(sanitizeSaved({ clips: "x" }, "user1/"), null);
});

test("곡 길이를 장면 수로 나누고 합은 곡 길이와 같다, 최대 길이는 프로그램마다 정한다", async () => {
  const { splitEvenly, validate } = await import("../lib/edit/timeline.ts");
  const parts = splitEvenly(185.5, 6);
  assert.equal(parts.length, 6);
  assert.ok(Math.abs(parts.reduce((a, b) => a + b, 0) - 185.5) < 1e-9);
  assert.deepEqual(splitEvenly(0, 3), []);
  const long = project(Array.from({ length: 6 }, (_, i) => clip(`c${i}`, 40)));
  assert.match(validate(long), /최대 3분/);
  assert.equal(validate(long, 300), null);
});
