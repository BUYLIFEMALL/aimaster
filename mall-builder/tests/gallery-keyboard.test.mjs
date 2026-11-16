import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// FRONT-20261117-01 — 템플릿 갤러리 키보드 접근성 회귀 시험(.tsx는 바로 못 불러와 소스 글자를 본다, 주석 줄 제외)
// 전: 카드마다 색 단추 12개가 모두 Tab 순서(전체 33종 × 12 = 396개), 업종 거르기는 선택 상태가 aria-pressed로 안 알려짐
const src = readFileSync(new URL("../src/app/s/[store]/admin/design/templates/template-gallery.tsx", import.meta.url), "utf8")
  .split(/\r?\n/).filter((l) => !/^\s*(\/\/|\{\/\*)/.test(l)).join("\n");

test("색 고르기: 카드마다 고른 색 하나만 Tab으로 들어간다(나머지 tabIndex -1), 선택 표시는 aria-checked 그대로", () => {
  assert.match(src, /role="radiogroup"[\s\S]{0,80}aria-label=\{`\$\{l\.name\} 색`\}/);
  assert.match(src, /tabIndex=\{c\.id === color\.id \? 0 : -1\}/);
  assert.match(src, /aria-checked=\{c\.id === color\.id\}/);
});

test("색 고르기: 화살표 4방향은 돌아가며, Home/End는 처음·끝, 고른 색으로 초점도 옮긴다", () => {
  const fn = src.slice(src.indexOf("function radioKeyIndex"), src.indexOf("/** 레이아웃 모양 도식"));
  const radioKeyIndex = new Function(`${fn.replace(/: (string|number)(\s*\|\s*null)?/g, "")}; return radioKeyIndex;`)();
  assert.equal(radioKeyIndex("ArrowRight", 11, 12), 0);
  assert.equal(radioKeyIndex("ArrowDown", 3, 12), 4);
  assert.equal(radioKeyIndex("ArrowLeft", 0, 12), 11);
  assert.equal(radioKeyIndex("ArrowUp", 5, 12), 4);
  assert.equal(radioKeyIndex("Home", 7, 12), 0);
  assert.equal(radioKeyIndex("End", 0, 12), 11);
  assert.equal(radioKeyIndex("Tab", 3, 12), null);
  assert.equal(radioKeyIndex("Enter", 3, 12), null);
  assert.match(src, /onKeyDown=\{\(e\) => \{[\s\S]*?radioKeyIndex\(e\.key[\s\S]*?e\.preventDefault\(\);[\s\S]*?setPicked[\s\S]*?\.focus\(\)/);
});

test("클릭으로 고르기와 미리보기 주소는 그대로(고른 색이 주소에 들어감)", () => {
  assert.match(src, /onClick=\{\(\) => setPicked\(\(p\) => \(\{ \.\.\.p, \[l\.id\]: c\.id \}\)\)\}/);
  assert.match(src, /href=\{`\/s\/\$\{slug\}\/admin\/design\?template=\$\{encodeURIComponent\(l\.id\)\}&color=\$\{encodeURIComponent\(colorId\)\}`\}/);
});

test("업종 거르기: 라디오가 아닌 토글 단추 — aria-pressed로 선택 표시, 단추 목록은 거르기와 상관없이 그대로", () => {
  const filter = src.slice(src.indexOf("data-industry-filter"), src.indexOf("data-template-list"));
  assert.match(filter, /aria-pressed=\{industry === i\.id\}/);
  assert.doesNotMatch(filter, /role="radio"|aria-checked/);
  assert.match(filter, /\[\{ id: "", label: "전체" \}, \.\.\.industries\]\.map/);
});
