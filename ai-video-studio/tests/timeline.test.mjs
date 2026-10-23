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
