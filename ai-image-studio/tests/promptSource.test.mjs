// v1.26 보낸 곳 기록 — 무료 시험(Node 24 TS 타입 지우기로 공용 사본을 직접 불러옴)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BANANA_SOURCES, isBananaSource } from "../lib/bananaIdeaLink.ts";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("공용 이름표에 있는 이름만 보낸 곳으로 받는다", () => {
  assert.equal(isBananaSource("style-dna-analyzer"), true);
  assert.equal(BANANA_SOURCES["style-dna-analyzer"].url, "https://style-dna-analyzer.buylife.xyz");
  assert.equal(isBananaSource("toString"), false);
  assert.equal(isBananaSource("<b>"), false);
});

test("대시보드 안내·생성 요청·기록 저장 연결", () => {
  const page = read("app/(dashboard)/dashboard/page.tsx");
  assert.match(page, /promptSourceInfo\(searchParams\.get\("src"\)\)/);
  assert.match(page, /ideaSource=\{promptSource\?\.key\}/);
  assert.match(read("components/Step2PlatformGenerator.tsx"), /options: optionValues,\s*ideaSource/);
  const route = read("app/api/generate/route.ts");
  assert.match(route, /const source = promptSourceKey\(ideaSource\)/);
  assert.match(route, /\.\.\.\(source \? \{ ideaSource: source \} : \{\}\)/);
});
