// 2026-11-20: 매물 등록 폼(일반·후보 모드) — 저장 실패·응답 불명 때 입력이 사라지지 않게 <form action> 자동 초기화를 쓰지 않는다(PLAN E9)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/components/desk/AddListingForm.tsx", import.meta.url), "utf8");

test("등록 폼은 <form action>을 쓰지 않고 제출을 직접 처리한다", () => {
  assert.doesNotMatch(src, /<form\s+action=/);
  assert.match(src, /onSubmit=\{\(e\) => \{\s*e\.preventDefault\(\);/);
  assert.match(src, /startTransition\(\(\) => action\(fd\)\)/);
});

test("성공 때만 새 폼(key가 success로 바뀜), 후보·일반 모드 구분 유지", () => {
  assert.match(src, /key=\{`\$\{state\.success \?\? "form"\}-\$\{isCandidate \? "c" : "n"\}`\}/);
});

test("응답 불명은 자동 재시도 없이 안내만(기존 동작 유지)", () => {
  assert.match(src, /catch \{\s*return \{ error: UNKNOWN \};/);
});
