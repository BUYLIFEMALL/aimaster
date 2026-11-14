import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeSnapshot } from "../src/lib/builder/history.ts";

// D6 게시 기록 한 줄 요약(목록 화면에 보일 내용) — 기록은 DB 0081 mall_builder_design_history.snapshot
test("게시 기록 요약: 첫 화면 블록 수·첫 블록 이름·포인트색·들어 있는 조각", () => {
  const s = summarizeSnapshot({
    home: { schema_version: 1, blocks: [{ id: "a", type: "hero", visible: true, settings: {} }, { id: "b", type: "showcase", visible: false, settings: {} }] },
    theme: { primary: "#059669" },
    header: { band: { text: "x" } },
    footer: {},
  });
  assert.equal(s.blocks, 2);
  assert.equal(s.shownBlocks, 1);
  assert.equal(s.firstBlock, "글 히어로");
  assert.equal(s.primary, "#059669");
  assert.deepEqual(s.parts, ["첫 화면", "테마", "헤더", "바닥글"]);
});

test("게시 기록 요약: 비었거나 이상한 값이어도 깨지지 않는다", () => {
  for (const bad of [null, undefined, "x", [], { home: "x", theme: 3 }]) {
    const s = summarizeSnapshot(bad);
    assert.equal(s.blocks, 0);
    assert.equal(s.primary, "");
  }
  assert.equal(summarizeSnapshot({ home: { blocks: [{ type: "nope" }] } }).firstBlock, "");
  assert.equal(summarizeSnapshot({ theme: { primary: "red" } }).primary, ""); // #rrggbb만
});
