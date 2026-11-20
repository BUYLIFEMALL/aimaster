// 브라우저 렌더 배경음악 크기 시험 — 2026-11-20 영상 담당(MOV-SHOTS-BGM-VOLUME). 네트워크 없음.
// 실행: node --test tests/bgmVolume.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { BGM_VOLUME_DEFAULT, clampBgmVolume, bgmVolumeLabel, bgmMixInput, showBgmVolumeControl } = await import("../src/lib/render/bgmVolume.ts");

test("기본값은 예전 고정값 0.5 그대로(값을 안 넘기는 기존 호출 포함)", () => {
  assert.equal(BGM_VOLUME_DEFAULT, 0.5);
  assert.equal(clampBgmVolume(undefined), 0.5);
  assert.deepEqual(bgmMixInput("blob:a", undefined), { src: "blob:a", volume: 0.5 });
});

test("숫자가 아닌 값은 기본값 — 빈 값이 몰래 음소거(0)가 되지 않는다", () => {
  for (const v of [null, "", "   ", "abc", Number.NaN, Infinity, -Infinity, true, {}, []]) {
    assert.equal(clampBgmVolume(v), 0.5, `입력 ${JSON.stringify(v)}`);
  }
});

test("범위 밖은 0~1로 자르고 0.05 단위로 맞춘다(소수 오차 없음)", () => {
  assert.equal(clampBgmVolume(-1), 0);
  assert.equal(clampBgmVolume(3), 1);
  assert.equal(clampBgmVolume(0.33), 0.35);
  assert.equal(clampBgmVolume("0.8"), 0.8);
  assert.equal(clampBgmVolume(0.1 + 0.2), 0.3);
});

test("0은 진짜 음소거: 섞을 배경음악 입력이 없다(파일도 받지 않음)", () => {
  assert.equal(bgmMixInput("blob:a", 0), null);
  assert.equal(bgmMixInput("blob:a", -5), null, "음수도 0으로 잘려 음소거");
  assert.equal(bgmVolumeLabel(0), "끔");
  assert.deepEqual(bgmMixInput("blob:a", 0.05), { src: "blob:a", volume: 0.05 }, "가장 작은 칸은 음소거가 아님");
});

test("음악이 없으면 크기 칸을 숨기고 섞을 입력도 없다", () => {
  assert.equal(showBgmVolumeControl(null), false);
  assert.equal(showBgmVolumeControl(""), false);
  assert.equal(showBgmVolumeControl(undefined), false);
  assert.equal(showBgmVolumeControl("https://x/bgm.mp3"), true);
  assert.equal(bgmMixInput(null, 1), null);
  assert.equal(bgmMixInput("", 1), null);
});

test("표시: 0이면 「끔」, 나머지는 퍼센트", () => {
  assert.equal(bgmVolumeLabel(0.5), "50%");
  assert.equal(bgmVolumeLabel(1), "100%");
  assert.equal(bgmVolumeLabel(0.35), "35%");
});

// 목소리 크기 불변 — 공용 인코더(수정 금지 사본)를 바꾸지 않았고, 목소리는 크기 조절 없이 바로 출력으로 간다는 구조 확인
test("목소리 크기는 배경음악 크기와 무관하다(공용 인코더 구조)", () => {
  const enc = readFileSync(new URL("../src/lib/render/mp4Encoder.ts", import.meta.url), "utf8");
  assert.match(enc, /n\.buffer = await decode\(voices\[i\]\.src\); n\.connect\(ctx\.destination\)/, "목소리는 gain 없이 출력에 직접 연결");
  assert.match(enc, /const full = bgm\.volume, low = bgm\.volume \* DUCK;/, "배경음악 크기만 bgm.volume을 따르고, 목소리 구간 자동 낮춤(DUCK)은 그대로");
  assert.match(enc, /const DUCK = 0\.35;/);
  const story = readFileSync(new URL("../src/lib/render/story.ts", import.meta.url), "utf8");
  assert.doesNotMatch(story.split("mixVoiceAndBgm({")[1] ?? "", /^[^)]*bgmVolume[^)]*voices/, "목소리 쪽으로 크기를 넘기지 않음");
});
