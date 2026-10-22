// v1.24 ?idea= 받기 — 무료 시험
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cleanIdeaParam, MAX_IDEA } from "../src/lib/bnc/ideaParam.ts";

test("아이디어 주소값 정리", () => {
  assert.equal(cleanIdeaParam("  우주 고양이  "), "우주 고양이");
  assert.equal(cleanIdeaParam("x".repeat(700)).length, MAX_IDEA);
  assert.equal(cleanIdeaParam(""), undefined);
  assert.equal(cleanIdeaParam(["a"]), undefined);
  assert.equal(cleanIdeaParam(undefined), undefined);
});

test("스튜디오 페이지가 idea를 받아 칸을 채운다(자동 생성 없음)", () => {
  const page = readFileSync(new URL("../src/app/(workspace)/studio/page.tsx", import.meta.url), "utf8");
  assert.match(page, /initialIdea=\{cleanIdeaParam\(idea\)\}/);
  const studio = readFileSync(new URL("../src/components/studio/Studio.tsx", import.meta.url), "utf8");
  assert.match(studio, /useState\(initialIdea \?\? ""\)/);
});

test("v1.24 받은 아이디어 카드로 이동·강조(움직임 줄이기 존중)", () => {
  const studio = readFileSync(new URL("../src/components/studio/Studio.tsx", import.meta.url), "utf8");
  assert.match(studio, /getElementById\("card-generate"\)/);
  assert.match(studio, /prefers-reduced-motion: reduce/);
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.bc-card\.bc-flash\{animation:bcFlash/);
});

test("보낸 프로그램 이름(src) — 정해 둔 이름만", async () => {
  const { ideaSourceName } = await import("../src/lib/bnc/ideaParam.ts");
  assert.equal(ideaSourceName("reverse-prompt"), "리버스 프롬프트");
  assert.equal(ideaSourceName("emotion-writer"), "감성 글귀");
  assert.equal(ideaSourceName("style-dna-analyzer"), "이미지 스타일 분석기");
  assert.equal(ideaSourceName("toString"), undefined);
  assert.equal(ideaSourceName("<b>x</b>"), undefined);
  assert.equal(ideaSourceName(["reverse-prompt"]), undefined);
  const page = readFileSync(new URL("../src/app/(workspace)/studio/page.tsx", import.meta.url), "utf8");
  assert.match(page, /ideaSource=\{ideaSourceKey\(src\)\}/);
});

test("v1.25 받는 쪽 한도·이름표 = 공용 사본, 돌아가기 주소, 생성 기록에 보낸 곳", async () => {
  const { MAX_IDEA, ideaSourceUrl, ideaSourceKey } = await import("../src/lib/bnc/ideaParam.ts");
  const { MAX_BANANA_IDEA } = await import("../src/lib/bnc/bananaIdeaLink.ts");
  assert.equal(MAX_IDEA, MAX_BANANA_IDEA);
  assert.equal(ideaSourceUrl("reverse-prompt"), "https://reverse-prompt.buylife.xyz");
  assert.equal(ideaSourceUrl("javascript:alert(1)"), undefined);
  assert.equal(ideaSourceKey("emotion-writer"), "emotion-writer");
  const { cleanParams } = await import("../src/lib/bnc/tasks.ts");
  assert.equal(cleanParams({ kind: "generate", prompt: "고양이", ideaSource: "reverse-prompt" }).ideaSource, "reverse-prompt");
  assert.equal(cleanParams({ kind: "generate", prompt: "고양이", ideaSource: "evil" }).ideaSource, undefined);
  // v1.26: 이어서 편집한 작업도 같은 출처로 — 모든 작업 종류에서 받음(이름표에 있는 이름만)
  assert.equal(cleanParams({ kind: "edit", prompt: "x", ideaSource: "reverse-prompt" }).ideaSource, "reverse-prompt");
  assert.equal(cleanParams({ kind: "edit", prompt: "x", ideaSource: "x" }).ideaSource, undefined);
  const route = readFileSync(new URL("../src/app/api/run/route.ts", import.meta.url), "utf8");
  assert.match(route, /ideaSource: p\.ideaSource/);
  const studio = readFileSync(new URL("../src/components/studio/Studio.tsx", import.meta.url), "utf8");
  assert.match(studio, /maxLength=\{MAX_IDEA\}/);
  assert.match(studio, /data-idea-back/);
});

test("v1.26 이어서 편집 출처 이어받기·연계 결과 필터", () => {
  const studio = readFileSync(new URL("../src/components/studio/Studio.tsx", import.meta.url), "utf8");
  assert.match(studio, /ideaSource: carrySource, \.\.\.extra/);
  assert.match(studio, /ideaSourceKey\(r\.data\.item\.options\?\.ideaSource\)/);
  const list = readFileSync(new URL("../src/components/workspace/HistoryList.tsx", import.meta.url), "utf8");
  assert.match(list, /data-only-src/);
});
