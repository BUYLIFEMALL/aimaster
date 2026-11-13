import test from "node:test";
import assert from "node:assert/strict";
import { cleanLyrics } from "../lib/lyricsClean.ts";

test("가사 정리 — 굵은 글씨·줄 끝 공백·코드 울타리·제목 기호를 걷고 빈 줄은 하나로", () => {
  const raw = "```\n**[Verse 1 - Male Vocal]**  \n너와 나, 자전거 위  \n\n\n\n## [Chorus]\n__가을 바람__\n```";
  assert.equal(cleanLyrics(raw), "[Verse 1 - Male Vocal]\n너와 나, 자전거 위\n\n[Chorus]\n가을 바람");
});

test("가사 정리 — 이미 깨끗한 가사는 그대로", () => {
  const ok = "[Verse 1]\n비 오는 오후\n\n[Chorus]\n다시 시작해";
  assert.equal(cleanLyrics(ok), ok);
  assert.equal(cleanLyrics(""), "");
});
