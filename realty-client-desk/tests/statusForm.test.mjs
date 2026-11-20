// 2026-11-20(Mac 독립 검수 msg_e76ff8708dd4): 매물 상태 폼 — 성공 문구 유지(폼 key 안정)·선택값 동기화·오류 시 되돌림
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { selectedAfter, syncSelected } from "../src/lib/desk/statusForm.ts";

test("오류·응답 불명이면 선택값을 저장된 상태로 되돌린다", () => {
  assert.equal(selectedAfter({ error: "상태를 바꾸지 못했어요" }, "광고 중", "후보"), "광고 중");
});

test("성공이면 고른 값을 유지한다", () => {
  assert.equal(selectedAfter({ success: "「계약」(으)로 바꿨어요." }, "광고 중", "계약"), "계약");
});

test("목록이 새로 그려져 실제 상태가 바뀌면 그 값으로, 같으면 회원 선택 유지", () => {
  assert.equal(syncSelected("광고 중", "계약", "광고 중"), "계약");
  assert.equal(syncSelected("광고 중", "광고 중", "내림"), "내림");
});

test("목록은 폼 key를 매물 ID로만 준다(상태가 key에 있으면 성공 뒤 폼이 다시 만들어져 문구가 사라짐)", () => {
  const page = readFileSync(new URL("../src/app/(dashboard)/listings/page.tsx", import.meta.url), "utf8");
  const line = page.split("\n").find((l) => l.includes("<ListingStatusForm"));
  assert.ok(line, "ListingStatusForm 사용 줄");
  assert.match(line, /key=\{l\.id\}/);
  assert.doesNotMatch(line, /key=\{`[^`]*l\.status/);
  // 예전 줄이면 실패해야 한다(회귀 감지 확인)
  const old = '<ListingStatusForm key={`${l.id}-${l.status}`} id={l.id} status={l.status} />';
  assert.doesNotMatch(old, /key=\{l\.id\}/);
});
