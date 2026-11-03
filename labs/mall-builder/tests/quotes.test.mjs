import { test } from "node:test";
import assert from "node:assert/strict";
import { displayStatus, validateAnswer, addDays, todayKst } from "../src/lib/quotes.ts";

test("한국 날짜 — 자정 넘김", () => {
  assert.equal(todayKst(new Date("2026-11-03T15:30:00Z")), "2026-11-04");
  assert.equal(todayKst(new Date("2026-11-03T14:59:00Z")), "2026-11-03");
});

test("기한 지남 — 회신 견적만, 그날까지는 유효", () => {
  assert.equal(displayStatus("answered", "2026-11-10", "2026-11-10"), "answered");
  assert.equal(displayStatus("answered", "2026-11-09", "2026-11-10"), "expired");
  assert.equal(displayStatus("accepted", "2026-11-01", "2026-11-10"), "accepted");
  assert.equal(displayStatus("requested", null, "2026-11-10"), "requested");
});

test("회신 검사", () => {
  const ok = validateAnswer([{ id: "a", price: "40,000원" }, { id: "b", price: "0" }], "2026-11-11", "2026-11-04");
  assert.deepEqual(ok, { ok: true, value: { items: [{ id: "a", price: 40000 }, { id: "b", price: 0 }], valid_until: "2026-11-11" } });
  assert.match(validateAnswer([{ id: "a", price: "" }], "2026-11-11", "2026-11-04").error, /견적가/);
  assert.match(validateAnswer([{ id: "a", price: "1" }], "2026-11-03", "2026-11-04").error, /오늘 이후/);
  assert.match(validateAnswer([{ id: "a", price: "1" }], "2027-03-01", "2026-11-04").error, /90일/);
  assert.match(validateAnswer([], "2026-11-11", "2026-11-04").error, /품목/);
});

test("날짜 더하기", () => {
  assert.equal(addDays("2026-11-28", 7), "2026-12-05");
});
