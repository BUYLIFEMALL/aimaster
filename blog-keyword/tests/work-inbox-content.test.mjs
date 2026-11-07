// U10 2차: 분석 기록 → 업무 워크스페이스 「받은 업무」 내용(순수 함수). 네트워크·DB·AI 없음.
import test from "node:test";
import assert from "node:assert/strict";
import { reportInboxContent, kstDate } from "../src/lib/workInboxContent.ts";
import { toMarkdown } from "../src/lib/kw/export.ts";

const result = { kind: "autocomplete", keyword: "캠핑", engine: "naver", keywords: [{ text: "캠핑 의자", monthlyTotal: 1200 }, { text: "캠핑장" }] };

test("한국 시간 날짜", () => {
  assert.equal(kstDate("2026-11-06T16:30:00Z"), "2026-11-07");
  assert.equal(kstDate(null), null);
});

test("제목·구조 데이터·본문은 화면 결과 복사와 같은 마크다운", () => {
  const c = reportInboxContent({ keyword: " 캠핑 ", created_at: "2026-11-06T16:30:00Z", result });
  assert.ok(c.title.startsWith("블로그 키워드 — ") && c.title.endsWith(" · 캠핑"));
  assert.equal(c.data["키워드"], "캠핑");
  assert.equal(c.data["분석일"], "2026-11-07");
  assert.ok(c.data["기능"] && c.data["채널"] === undefined);
  assert.equal(c.bodyMd, toMarkdown(result));
  assert.ok(c.bodyMd.includes("캠핑 의자"));
});

test("키워드 없는 기록", () => {
  const c = reportInboxContent({ keyword: "", created_at: "bad", result });
  assert.ok(!c.title.includes(" · "));
  assert.equal(c.data["키워드"], undefined);
  assert.equal(c.data["분석일"], undefined);
});
