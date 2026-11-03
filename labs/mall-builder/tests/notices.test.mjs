import { test } from "node:test";
import assert from "node:assert/strict";
import { validateNotice } from "../src/lib/notices.ts";

test("공지 입력 검사", () => {
  assert.match(validateNotice({ title: "  ", body: "", pinned: null }).error, /제목을 넣어/);
  assert.match(validateNotice({ title: "가".repeat(101), body: "", pinned: null }).error, /100자/);
  assert.match(validateNotice({ title: "a", body: "가".repeat(5001), pinned: null }).error, /5,000자/);
  assert.deepEqual(validateNotice({ title: " 배송 안내 ", body: "줄1\r\n줄2 ", pinned: "on" }).value, { title: "배송 안내", body: "줄1\n줄2", is_pinned: true });
  assert.equal(validateNotice({ title: "a", body: "", pinned: null }).value.is_pinned, false);
});
