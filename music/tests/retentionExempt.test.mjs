import test from "node:test";
import assert from "node:assert/strict";
import { exemptInFilter, loadRetentionExemptIds } from "../lib/retentionExempt.ts";

const fakeDb = (result) => ({ from: () => ({ select: () => ({ eq: async () => result }) }) });

test("예외 회원 목록을 not in 필터로 만든다", async () => {
  const ids = await loadRetentionExemptIds(fakeDb({ data: [{ id: "a" }, { id: "b" }], error: null }));
  assert.equal(exemptInFilter(ids), "(a,b)");
});

test("예외 회원이 없으면 필터를 걸지 않는다", () => {
  assert.equal(exemptInFilter(new Set()), null);
});

test("예외 목록을 못 읽으면 정리를 멈춘다", async () => {
  await assert.rejects(loadRetentionExemptIds(fakeDb({ data: null, error: { message: "x" } })));
});
