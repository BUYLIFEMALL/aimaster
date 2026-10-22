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
  assert.match(page, /ideaSource=\{ideaSourceName\(src\)\}/);
});
