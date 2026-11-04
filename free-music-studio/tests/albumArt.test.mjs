import test from "node:test";
import assert from "node:assert/strict";
import { albumArtPrompt } from "../src/lib/albumArt.ts";

test("앨범 그림 설명: 기획 설명이 있으면 그대로, 없으면 제목·스타일로 — 정사각형·글자 금지·한국인 규칙은 늘", () => {
  const withArt = albumArtPrompt({ title: "가을", style: "jazz", art: "dim jazz bar at dusk" });
  assert.match(withArt, /Scene: dim jazz bar at dusk/);
  assert.match(withArt, /Square 1:1 album cover/);
  assert.match(withArt, /no text, letters/);
  assert.match(withArt, /Korean/);
  const noArt = albumArtPrompt({ title: "가을 노래", style: "lo-fi piano", art: "  " });
  assert.match(noArt, /titled "가을 노래"/);
  assert.match(noArt, /lo-fi piano/);
});
