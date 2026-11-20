// 2026-11-20(Mac 독립 검수 msg_e76ff8708dd4): 매물 상태 폼 — 성공 문구 유지(폼 key 안정)·선택값 동기화·오류 시 되돌림
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeSyncUpdater, selectedAfter, syncSelected } from "../src/lib/desk/statusForm.ts";

// Mac 재검수 msg_6f15eb6e4df2: React는 setState updater를 나중에 실행할 수 있다 — 그사이 ref가 새 값으로 바뀌어도 동기화돼야 함
test("늦게 실행되는 updater: 만들 때 붙잡은 이전·새 상태로 판단(외부 갱신 반영)", () => {
  const ref = { current: "광고 중" };
  const updater = makeSyncUpdater(ref.current, "계약");
  ref.current = "계약"; // effect가 ref를 먼저 바꾼 뒤
  assert.equal(updater("광고 중"), "계약", "늦게 실행돼도 새 상태로 맞춤");
  // 예전 방식(updater 안에서 ref를 늦게 읽음)은 같은 순서에서 동기화에 실패했다 — 회귀 기준
  const ref2 = { current: "광고 중" };
  const buggy = (sel) => syncSelected(ref2.current, "계약", sel);
  ref2.current = "계약";
  assert.equal(buggy("광고 중"), "광고 중");
});

test("외부 갱신이 회원이 고르던 다른 값보다 우선, 상태가 그대로면 회원 편집 보존", () => {
  assert.equal(makeSyncUpdater("광고 중", "계약")("내림"), "계약");
  assert.equal(makeSyncUpdater("광고 중", "광고 중")("내림"), "내림");
});

test("컴포넌트는 붙잡은 값으로 만든 updater를 쓰고, updater 안에서 ref를 늦게 읽지 않는다", () => {
  const src = readFileSync(new URL("../src/components/desk/ListingStatusForm.tsx", import.meta.url), "utf8");
  assert.match(src, /setSelected\(makeSyncUpdater\(prev, status\)\)/);
  assert.doesNotMatch(src, /setSelected\(\([^)]*\)\s*=>[^;]*lastStatus\.current/);
});

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
