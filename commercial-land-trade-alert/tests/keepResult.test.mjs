import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mergeLastResult, KEEP_MAX_AGE_MS, MAX_TABLE_ROWS } from "../extension/lib/keepResult.js";
import { COLUMNS } from "../extension/lib/sheet.js";

const W = COLUMNS.indexOf("감시 화면");
const U = COLUMNS.indexOf("네이버 매물 주소");
const NOW = Date.parse("2026-11-19T12:00:00Z");
const T0 = "2026-11-19T03:00:00.000Z"; // 이전 회차
const T1 = "2026-11-19T11:00:00.000Z"; // 이번 회차

const tgt = (id, name, url = `https://new.land.naver.com/offices?ms=${id}`) => ({ id, name, url });
const row = (name, no, url) => { const r = COLUMNS.map(() => ""); r[W] = name; r[U] = `${url}&articleNo=${no}`; return r; };
const per = (t, at, extra = {}) => ({ id: t.id, url: t.url, at, name: t.name, total: 1, events: 0, complete: true, ...extra });

// 이전 회차: A·B·C 세 화면을 모두 읽은 결과
function prevOf(ts) {
  const table = [], rowTargetIds = [], places = {}, sggByWatch = {};
  ts.forEach((t, i) => { table.push(row(t.name, `${i}01`, t.url)); rowTargetIds.push(t.id); places[`${i}01`] = [37 + i, 127]; sggByWatch[t.name] = `1111${i}`; });
  return { at: T0, columns: COLUMNS, table, rowTargetIds, places, sggByWatch, perTarget: ts.map((t) => per(t, T0)) };
}
const nextOf = (ts) => ({ at: T1, columns: COLUMNS, table: ts.map((t) => row(t.name, "999", t.url)), rowTargetIds: ts.map((t) => t.id), places: { 999: [1, 1] }, sggByWatch: {}, perTarget: ts.map((t) => per(t, T1)) });

test("1. 일부만 읽음: 읽은 화면은 새 결과, 못 읽은 화면은 이전 결과·이전 시각·사유", () => {
  const [a, b, c] = [tgt("a", "역삼 상가"), tgt("b", "백석 건물"), tgt("c", "장항 토지")];
  const out = mergeLastResult(prevOf([a, b, c]), nextOf([a]), { targets: [a, b, c], unread: new Map([["b", "limit"], ["c", "blocked"]]), now: NOW });
  assert.deepEqual(out.rowTargetIds, ["a", "b", "c"]);
  assert.equal(out.table[0][U].endsWith("articleNo=999"), true, "이번 회차 줄이 맨 앞");
  const pb = out.perTarget.find((p) => p.id === "b");
  assert.deepEqual([pb.stale, pb.at, pb.reason], [true, T0, "limit"]);
  assert.equal(out.perTarget.find((p) => p.id === "c").reason, "blocked", "막힘도 보존(주인님 결정)");
  assert.equal(out.perTarget.find((p) => p.id === "a").stale, undefined);
  assert.deepEqual(out.places["101"], [38, 127], "남긴 줄의 좌표만 가져옴");
  assert.equal(out.sggByWatch["백석 건물"], "11111");
  assert.equal(out.partial, true);
});

test("2. 모두 읽음: 이전 결과를 섞지 않음", () => {
  const ts = [tgt("a", "A"), tgt("b", "B")];
  const out = mergeLastResult(prevOf(ts), nextOf(ts), { targets: ts, unread: new Map(), now: NOW });
  assert.equal(out.table.length, 2);
  assert.equal(out.partial, false);
  assert.ok(out.table.every((r) => r[U].endsWith("articleNo=999")));
});

test("3. 같은 이름 두 화면: id로 나눠 못 읽은 쪽만 남김", () => {
  const a = tgt("a", "상가"), b = tgt("b", "상가");
  const prev = prevOf([a, b]);
  const out = mergeLastResult(prev, nextOf([a]), { targets: [a, b], unread: new Map([["b", "error"]]), now: NOW });
  assert.deepEqual(out.rowTargetIds, ["a", "b"]);
  assert.equal(out.table[1][U], prev.table[1][U], "b의 이전 줄");
  assert.ok(!out.table.some((r) => r[U] === prev.table[0][U]), "a의 이전 줄은 섞이지 않음");
});

test("4. 지운·끈 화면, 주소 바뀐 화면은 남기지 않고, 이름만 바뀐 화면은 새 이름으로 남김", () => {
  const a = tgt("a", "A"), b = tgt("b", "옛 이름"), c = tgt("c", "C"), d = tgt("d", "D");
  const prev = prevOf([a, b, c, d]);
  const bRenamed = { ...b, name: "새 이름" };
  const cMoved = { ...c, url: "https://new.land.naver.com/offices?ms=other" };
  // d는 지웠거나 끔 → 이번 targets에 없음
  const out = mergeLastResult(prev, nextOf([a]), { targets: [a, bRenamed, cMoved], unread: new Map([["b", "limit"], ["c", "limit"], ["d", "limit"]]), now: NOW });
  assert.deepEqual(out.rowTargetIds, ["a", "b"]);
  assert.equal(out.table[1][W], "새 이름");
  assert.equal(out.perTarget.find((p) => p.id === "b").name, "새 이름");
  assert.equal(out.sggByWatch["새 이름"], "11111");
});

test("5. 7일 넘은 결과는 버리고, 남긴 것을 다시 남겨도 시각은 그대로", () => {
  const a = tgt("a", "A"), b = tgt("b", "B");
  const old = prevOf([a, b]);
  const tooOld = mergeLastResult(old, nextOf([a]), { targets: [a, b], unread: new Map([["b", "limit"]]), now: Date.parse(T0) + KEEP_MAX_AGE_MS + 1 });
  assert.deepEqual(tooOld.rowTargetIds, ["a"]);
  const once = mergeLastResult(old, nextOf([a]), { targets: [a, b], unread: new Map([["b", "limit"]]), now: NOW });
  const twice = mergeLastResult(once, nextOf([a]), { targets: [a, b], unread: new Map([["b", "blocked"]]), now: NOW + 3600_000 });
  const pb = twice.perTarget.find((p) => p.id === "b");
  assert.deepEqual([pb.at, pb.reason, twice.rowTargetIds.filter((x) => x === "b").length], [T0, "blocked", 1]);
});

test("6. 옛 모양 결과(id 없음)는 통째 교체, 2000줄 자르기는 이번 회차 줄 우선", () => {
  const a = tgt("a", "A"), b = tgt("b", "B");
  const legacy = { at: T0, columns: COLUMNS, table: [row("B", "1", b.url)], perTarget: [{ name: "B", total: 1, complete: true }] };
  const out = mergeLastResult(legacy, nextOf([a]), { targets: [a, b], unread: new Map([["b", "limit"]]), now: NOW });
  assert.deepEqual(out.rowTargetIds, ["a"]);
  assert.equal(out.partial, false);
  const prev = prevOf([b]);
  prev.table = Array.from({ length: MAX_TABLE_ROWS }, (_, i) => row("B", `5${i}`, b.url));
  prev.rowTargetIds = prev.table.map(() => "b");
  const next = nextOf([a]);
  next.table = Array.from({ length: 10 }, (_, i) => row("A", `7${i}`, a.url));
  next.rowTargetIds = next.table.map(() => "a");
  const cut = mergeLastResult(prev, next, { targets: [a, b], unread: new Map([["b", "limit"]]), now: NOW });
  assert.equal(cut.table.length, MAX_TABLE_ROWS);
  assert.equal(cut.rowTargetIds.length, MAX_TABLE_ROWS);
  assert.deepEqual(cut.rowTargetIds.slice(0, 10), Array(10).fill("a"));
});

test("7. 알림·기록 분리: 합치기는 이번 회차 입력을 바꾸지 않음", () => {
  const ts = [tgt("a", "A"), tgt("b", "B")];
  const next = nextOf([ts[0]]);
  const snap = JSON.stringify(next);
  mergeLastResult(prevOf(ts), next, { targets: ts, unread: new Map([["b", "limit"]]), now: NOW });
  assert.equal(JSON.stringify(next), snap);
});

test("8. 알림·기록 분리: background.js는 알림·통계·수익률에 이번 회차 table·perTarget만 넘김", () => {
  const src = readFileSync(new URL("../extension/background.js", import.meta.url), "utf8");
  const run = src.slice(src.indexOf("async function runCollection"), src.indexOf("async function deliver"));
  const merged = run.indexOf("mergeLastResult(");
  assert.ok(merged > 0);
  const after = run.slice(merged);
  assert.match(after, /deliver\(\{ settings, perTarget, table, result, errMsg, trigger, limitHit \}\)/);
  assert.match(after, /summarizeTable\(COLUMNS, table, startedAt, sggByWatch\)/);
  assert.match(after, /pickEvents\(COLUMNS, table, startedAt\)/);
  assert.ok(run.indexOf("applyYields(yieldRows)") < merged, "수익률은 합치기 전 이번 회차 줄로만");
  assert.doesNotMatch(after, /deliver\([^)]*lastResult/);
});
