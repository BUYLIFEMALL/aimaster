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

// D6-3 동시 편집 경고 — 편집기를 연 뒤 다른 곳(다른 직원·다른 탭)에서 저장했는지
test("마지막 저장 시각: 여러 시각 중 가장 늦은 것, 빈 값은 건너뜀", async () => {
  const { latestStamp } = await import("../src/lib/builder/history.ts");
  assert.equal(latestStamp([]), null);
  assert.equal(latestStamp([null, undefined, "x"]), null);
  assert.equal(latestStamp(["2026-11-15T00:00:00.000Z", null, "2026-11-15T00:00:05.000Z", "2026-11-14T23:00:00Z"]), "2026-11-15T00:00:05.000Z");
});

test("다른 곳에서 먼저 저장했나: 연 뒤 더 늦게 저장된 게 있으면 true", async () => {
  const { isStale } = await import("../src/lib/builder/history.ts");
  assert.equal(isStale(null, null), false); // 처음 꾸미는 몰
  assert.equal(isStale(null, "2026-11-15T00:00:00Z"), true); // 열 때는 없었는데 그사이 누가 저장
  assert.equal(isStale("2026-11-15T00:00:00Z", null), false);
  assert.equal(isStale("2026-11-15T00:00:00.000Z", "2026-11-15T00:00:00.000Z"), false);
  assert.equal(isStale("2026-11-15T00:00:00.000Z", "2026-11-15T00:00:01.000Z"), true);
  assert.equal(isStale("2026-11-15T00:00:01.000Z", "2026-11-15T00:00:00.000Z"), false);
  assert.equal(isStale("2026-11-15T09:00:00+09:00", "2026-11-15T00:00:00.000Z"), false); // 같은 순간, 다른 표기
});
