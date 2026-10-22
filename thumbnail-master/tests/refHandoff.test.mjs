import test from "node:test";
import assert from "node:assert/strict";
import { refHandoffHash } from "../src/lib/reference.ts";

// 이 탭 저장소(sessionStorage) 흉내
const store = new Map();
globalThis.sessionStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
const { stashRefHandoff, hasStashedRefHandoff, takeRefHandoff } = await import("../src/lib/refHandoff.ts");

test("v1.10 원스톱이 넘긴 대본: 주소에서 바로 받고, 보낸 프로그램 이름도", () => {
  const hash = refHandoffHash("주제: 재테크\n\n첫 장면 A&B", "AI 쇼츠 원스톱 제작 자동화");
  assert.deepEqual(takeRefHandoff(hash), { text: "주제: 재테크\n\n첫 장면 A&B", from: "AI 쇼츠 원스톱 제작 자동화" });
  assert.deepEqual(takeRefHandoff(""), { text: "", from: "" });
});

test("v1.10 로그인 화면을 거치면 보관했다가 한 번만 꺼냄", () => {
  assert.equal(stashRefHandoff(refHandoffHash("보관할 대본", "원스톱")), true);
  assert.equal(hasStashedRefHandoff(), true);
  assert.deepEqual(takeRefHandoff(""), { text: "보관할 대본", from: "원스톱" });
  assert.equal(hasStashedRefHandoff(), false);
  assert.equal(stashRefHandoff("#other=1"), false);
});
