import test from "node:test";
import assert from "node:assert/strict";
import { VIDEO_TEMPLATES, canvasBitrate, chapterText, fitToTemplate, h264Codec, templateOf, validateVideoOptions, DEFAULT_VIDEO_OPTIONS } from "../src/lib/video/videoOptions.ts";
import { CANVAS_SCENES } from "../src/lib/video/canvas-scene.mjs";

test("템플릿 37개 — 모든 템플릿의 장면 코드가 있다", () => {
  assert.equal(VIDEO_TEMPLATES.length, 37);
  for (const t of VIDEO_TEMPLATES) assert.ok(CANVAS_SCENES.includes(t.scene), t.id);
});

test("설정 확인: 크기 계산·템플릿 제한", () => {
  const v = validateVideoOptions({ resolution: 720, aspect: "9:16" });
  assert.equal(v.width, 720);
  assert.equal(v.height, 1280);
  assert.throws(() => validateVideoOptions({ template: "karaoke", mode: "instrumental" }), /가사 영상|연주곡 영상/);
  assert.throws(() => validateVideoOptions({ repeat: 21 }));
  assert.throws(() => validateVideoOptions({ brand: "가".repeat(41) }), /40자/);
  assert.equal(validateVideoOptions({ brand: "  나의\n채널  " }).brand, "나의 채널");
});

test("템플릿 바꾸기: 맞지 않는 모드·스펙트럼을 맞춘다", () => {
  const karaoke = templateOf("karaoke");
  const fitted = fitToTemplate({ ...DEFAULT_VIDEO_OPTIONS, spectrum: "ring" }, karaoke);
  assert.equal(fitted.mode, "vocal");
  assert.equal(fitted.spectrum, "mirror");
  assert.doesNotThrow(() => validateVideoOptions(fitted));
});

test("인코더 레벨·비트레이트·챕터 글", () => {
  assert.equal(h264Codec({ width: 1920, height: 1080, fps: 30 }), "avc1.640028");
  assert.equal(h264Codec({ width: 1920, height: 1080, fps: 60 }), "avc1.64002A");
  assert.equal(h264Codec({ width: 3840, height: 2160, fps: 30 }), "avc1.640033");
  assert.equal(canvasBitrate({ width: 640, height: 360, fps: 24 }), 2.5e6);
  assert.equal(chapterText([{ start: 0, title: "첫 곡" }, { start: 3725.4, title: "끝 곡" }]), "0:00 첫 곡\n1:02:05 끝 곡");
});
