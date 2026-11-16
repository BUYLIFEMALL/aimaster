import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// FRONT-20261116-08 — 「전체 폭」 블록이 100vw(스크롤바 폭 포함)로 넓어져
// 편집기 휴대폰 미리보기 가로 넘침(384/376)·PC 좁은 폭 정렬 7px 어긋남이 생기던 문제의 회귀 시험
const src = readFileSync(new URL("../src/app/s/[store]/home-blocks.tsx", import.meta.url), "utf8");
// 주석(설명 글)은 빼고 실제 코드만 본다
const fn = src
  .slice(src.indexOf("export function blockFrame("), src.indexOf("export function HomeBlocks("))
  .split(/\r?\n/)
  .filter((l) => !/^\s*\/\//.test(l))
  .join("\n");

test("blockFrame은 100vw 폭·margin 계산을 쓰지 않는다(section 폭은 본문 상자 그대로)", () => {
  assert.ok(fn.length > 100, "blockFrame을 찾지 못함");
  assert.doesNotMatch(fn, /100vw/);
  assert.doesNotMatch(fn, /css\.width\s*=/);
  assert.doesNotMatch(fn, /css\.marginLeft\s*=/);
});

test("전체 폭 배경은 border-image 바깥 칠(그리기 전용)로 좌우 끝까지", () => {
  assert.match(fn, /style\.width === "full"\) css\.borderImage = `conic-gradient\(\$\{style\.bg_color\} 0 0\) fill 0 \/ \/ 0 100vmax`/);
  // clip-path는 위아래 그림자·포커스 링을 자르므로 쓰지 않는다
  assert.doesNotMatch(fn, /clipPath|clip-path/);
});

test("전체 폭이면 backgroundColor를 겹쳐 칠하지 않고, 상자형은 예전처럼 backgroundColor", () => {
  assert.match(fn, /else css\.backgroundColor = style\.bg_color/);
  assert.equal((fn.match(/css\.backgroundColor\s*=/g) || []).length, 1);
});

test("안쪽 내용은 그대로 max-w-6xl 상자 안(전체 폭 표시 full 값 유지)", () => {
  assert.match(src, /f\.full \? <div className="mx-auto max-w-6xl">\{body\}<\/div> : body/);
  assert.match(fn, /full: style\.width === "full"/);
});
