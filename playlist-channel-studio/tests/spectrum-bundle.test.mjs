// P-1·P-3·P-5(2026-10-24) 순수 함수 시험 — 곡 제목 정리, 배경 전환 상태, 설정 정리
import test from "node:test";
import assert from "node:assert/strict";
import { trackTitle } from "../src/lib/render/title-layer.ts";
import { slideState } from "../src/lib/render/background-layer.ts";
import { sanitizeSettings, GENRE_PRESETS } from "../src/lib/settings-store.ts";
import { DEFAULT_SETTINGS } from "../src/data/presets.ts";

test("곡 제목: 확장자·밑줄 정리", () => {
  assert.equal(trackTitle("밤하늘_아래_우리.mp3"), "밤하늘 아래 우리");
  assert.equal(trackTitle("Song (Lofi ver).FLAC"), "Song (Lofi ver)");
  assert.equal(trackTitle(".mp3"), "제목 없음");
});

test("배경 전환: 곡마다 — 곡 시작에서 전환, 전환 시간 뒤엔 끝", () => {
  const s = { ...DEFAULT_SETTINGS, bgSlideMode: "track", bgTransition: "fade", bgTransitionSeconds: 2 };
  assert.deepEqual(slideState(3, s, 0, 0, 0), { to: 0, from: -1, p: 1, effect: "fade" }, "첫 곡은 전환 없음");
  const mid = slideState(3, s, 101, 1, 1);
  assert.equal(mid.to, 1); assert.equal(mid.from, 0); assert.ok(mid.p > 0 && mid.p < 1);
  assert.equal(slideState(3, s, 105, 1, 5).from, -1, "전환 끝");
  assert.equal(slideState(3, s, 0, 4, 0.5).to, 1, "곡 번호가 배경 수보다 크면 돌아감");
});

test("배경 전환: N초마다·랜덤은 같은 전환 번호면 같은 효과", () => {
  const s = { ...DEFAULT_SETTINGS, bgSlideMode: "interval", bgSlideSeconds: 10, bgTransition: "random", bgTransitionSeconds: 1 };
  const a = slideState(2, s, 20.3, 0, 0), b = slideState(2, s, 20.6, 0, 0);
  assert.equal(a.to, 0); assert.equal(a.from, 1); assert.equal(a.effect, b.effect);
  assert.equal(slideState(1, s, 20.3, 0, 0).from, -1, "배경 1장이면 전환 없음");
  assert.equal(slideState(3, { ...s, bgSlideMode: "off" }, 50, 2, 3).to, 0, "끔이면 첫 배경");
});

test("설정 정리: 아는 칸·같은 종류만, 파일 주소는 저장 안 함", () => {
  const out = sanitizeSettings({ barCount: 32, titleEnabled: "yes", logoUrl: "blob:x", unknownKey: 1, visualizerType: "CIRCLE", primaryColor: "x".repeat(99) });
  assert.deepEqual(out, { barCount: 32, visualizerType: "CIRCLE" });
  assert.deepEqual(sanitizeSettings(null), {});
});

test("장르 프리셋: 모든 값이 기본 설정에 있는 칸이고 종류가 같다", () => {
  for (const g of GENRE_PRESETS) {
    for (const [k, v] of Object.entries(g.patch)) {
      assert.ok(k in DEFAULT_SETTINGS, `${g.id}.${k}`);
      assert.equal(typeof v, typeof DEFAULT_SETTINGS[k], `${g.id}.${k} 종류`);
    }
  }
});
