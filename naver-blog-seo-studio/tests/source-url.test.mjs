import { test } from "node:test";
import assert from "node:assert/strict";
import { classifySourceUrl, readPaste, PASTE_MIN, PASTE_MAX } from "../lib/sourceUrl.ts";

// D-4 (2026-10-24): 「자료부터 집필」 주소 판별·붙여넣기 검사.
test("D-4: classifies YouTube watch/short/youtu.be/shorts/embed links and extracts the 11-char id", () => {
  for (const url of ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3", "https://youtu.be/dQw4w9WgXcQ?si=x", "https://m.youtube.com/shorts/dQw4w9WgXcQ", "https://www.youtube.com/embed/dQw4w9WgXcQ", "https://youtube.com/live/dQw4w9WgXcQ"]) {
    assert.deepEqual(classifySourceUrl(url), { kind: "youtube", videoId: "dQw4w9WgXcQ" }, url);
  }
  assert.deepEqual(classifySourceUrl("https://www.youtube.com/watch?v=short"), { kind: "web" });
  assert.deepEqual(classifySourceUrl("https://www.youtube.com/@channel"), { kind: "web" });
});

test("D-4: PDF by path, everything else is web (including invalid strings)", () => {
  assert.deepEqual(classifySourceUrl("https://www.korea.kr/files/report.PDF?download=1"), { kind: "pdf" });
  assert.deepEqual(classifySourceUrl("https://blog.naver.com/abc/123"), { kind: "web" });
  assert.deepEqual(classifySourceUrl("not a url"), { kind: "web" });
});

test("D-4: paste must be 100~20,000 chars; empty means none; link kept only when http(s)", () => {
  assert.equal(readPaste("", "https://a.com"), null);
  assert.equal(readPaste(undefined, undefined), null);
  assert.match(readPaste("짧음", "").error, /100~20,000자/);
  assert.match(readPaste("가".repeat(PASTE_MAX + 1), "").error, /100~20,000자/);
  assert.deepEqual(readPaste(`  ${"나".repeat(PASTE_MIN)}  `, "https://example.com/x"), { text: "나".repeat(PASTE_MIN), link: "https://example.com/x" });
  assert.equal(readPaste("다".repeat(PASTE_MIN), "javascript:alert(1)").link, "");
});

// 사설 주소 차단은 공용 기준 코드 safe-fetch(ghost-scraper) 사본 그대로 — 사본 맨 위 "server-only" 때문에 node 시험에서는 불러오지 않는다(check-shared-modules가 사본 일치를 확인).
