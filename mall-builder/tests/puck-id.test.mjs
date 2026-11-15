import { test } from "node:test";
import assert from "node:assert/strict";
import { compactPuckId, fromPuck } from "../src/lib/builder/puck-adapter.ts";

// I17 — Puck 번호(45자)를 40자 안의 일정한 번호로
test("긴 Puck 번호는 종류-12자리로 줄고, 같은 입력이면 늘 같은 번호", () => {
  const long = "showcase-1a2b3c4d-5e6f-4711-8899-aabbccddeeff";
  assert.equal(compactPuckId(long), "showcase-1a2b3c4d5e6f");
  assert.equal(compactPuckId(long), compactPuckId(long));
  assert.equal(compactPuckId("t-em-cover"), "t-em-cover");
  assert.equal(compactPuckId(undefined), undefined);
});

test("저장 문서에 짧은 번호가 들어가고, 서로 다른 Puck 번호는 겹치지 않는다", () => {
  const item = (id) => ({ type: "notice", props: { id, visible: true, settings: { title: "공지", count: 3 }, style: {} } });
  const r = fromPuck({ root: { props: {} }, content: [item("notice-11111111-2222-4333-8444-555555555555"), item("notice-99999999-2222-4333-8444-555555555555")] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value.blocks.map((b) => b.id), ["notice-111111112222", "notice-999999992222"]);
});
