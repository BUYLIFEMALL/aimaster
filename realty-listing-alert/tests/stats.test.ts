// 통계·추이 요약(2026-10-25) 순수 함수 시험 — node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePriceCell, pushHistory, summarizeTable } from "../extension/lib/stats.js";
import { COLUMNS } from "../extension/lib/sheet.js";

const row = (name: string, trade: string, price: string, area: string, realtor: string, status = "유지") => {
  const r = COLUMNS.map(() => "");
  const set = (c: string, v: string) => { r[COLUMNS.indexOf(c)] = v; };
  set("단지명", name); set("거래 종류", trade); set("가격(만 원)", price); set("전용면적(㎡)", area); set("중개사 상호", realtor); set("상태", status);
  return r;
};

test("가격 칸 읽기: 매매·전세와 월세(보증금/월세)", () => {
  assert.deepEqual(parsePriceCell("8억 3,000"), { price: 83000, rent: null });
  assert.deepEqual(parsePriceCell("6,000 / 190"), { price: 6000, rent: 190 });
  assert.deepEqual(parsePriceCell(""), { price: null, rent: null });
});

test("단지·거래별 요약: 개수·평균·중간값·㎡당·면적대·월세, 사라짐은 지금 매물에서 뺀다", () => {
  const table = [
    row("A단지", "매매", "8억", "59", "가부동산"),
    row("A단지", "매매", "10억", "84", "가부동산", "🆕 신규"),
    row("A단지", "매매", "12억", "84", "나부동산", "📉 가격 내림"),
    row("A단지", "전세", "5억", "59", "나부동산"),
    row("A단지", "월세", "6,000 / 190", "59", "다부동산"),
    row("A단지", "매매", "9억", "59", "가부동산", "👋 사라짐"),
    row("B단지", "매매", "7억", "84", "가부동산"),
  ];
  const s = summarizeTable(COLUMNS, table, "2026-10-25T06:00:00Z");
  const a = s.complexes.find((c: { name: string }) => c.name === "A단지");
  assert.equal(a.total, 5);
  assert.deepEqual(a.events, { new: 1, priceDown: 1, priceUp: 0, gone: 1 });
  const sale = a.trades["매매"];
  assert.equal(sale.n, 3);
  assert.equal(sale.avg, 100000);
  assert.equal(sale.med, 100000);
  assert.equal(sale.min, 80000);
  assert.equal(sale.max, 120000);
  assert.equal(sale.perM2, Math.round((80000 / 59 + 100000 / 84 + 120000 / 84) / 3));
  assert.deepEqual(sale.bands.map((b: { label: string; n: number }) => [b.label, b.n]), [["60㎡ 미만", 1], ["60~85㎡", 2]]);
  assert.equal(a.trades["월세"].rentAvg, 190);
  assert.equal(a.trades["월세"].avg, 6000);
  assert.deepEqual(s.realtors[0], { name: "가부동산", n: 3 }); // 사라진 매물은 세지 않음(A 2 + B 1)
});

test("기록 쌓기: 1년 지난 것과 최대 개수를 넘는 것은 정리", () => {
  const now = Date.parse("2026-10-25T00:00:00Z");
  const old = { at: "2025-09-01T00:00:00Z", complexes: [], realtors: [] };
  const recent = { at: "2026-10-24T00:00:00Z", complexes: [], realtors: [] };
  const next = { at: "2026-10-25T00:00:00Z", complexes: [], realtors: [] };
  assert.deepEqual(pushHistory([old, recent], next, { now }).map((h: { at: string }) => h.at), [recent.at, next.at]);
  assert.equal(pushHistory([recent, recent, recent], next, { now, max: 2 }).length, 2);
});

test("변동 기록: 상태가 바뀐 매물만 고르고 1년·최대 줄 수로 정리", async () => {
  const { pickEvents, pushEvents } = await import("../extension/lib/stats.js");
  const table = [row("A", "매매", "8억", "59", "가"), row("A", "매매", "9억", "84", "가", "🆕 신규"), row("A", "전세", "5억", "59", "나", "👋 사라짐"), row("A", "매매", "7억", "59", "나", "📈 가격 오름")];
  const ev = pickEvents(COLUMNS, table, "2026-10-25T00:00:00Z");
  assert.deepEqual(ev.map((e: { type: string }) => e.type), ["new", "gone", "priceUp"]);
  const now = Date.parse("2026-10-25T00:00:00Z");
  const old = { at: "2025-09-01T00:00:00Z", type: "new", row: [] };
  assert.equal(pushEvents([old], ev, { now }).length, 3);
  assert.equal(pushEvents([], ev, { now, max: 2 }).length, 2);
});

test("보관 1년: 30일 지난 변동 줄은 전화번호 칸만 비운다", async () => {
  const { pushEvents } = await import("../extension/lib/stats.js");
  const now = Date.parse("2026-10-25T00:00:00Z");
  const office = COLUMNS.indexOf("사무실 번호"), mobile = COLUMNS.indexOf("휴대폰");
  const mk = (at: string) => { const r = COLUMNS.map(() => "x"); return { at, type: "new", row: r }; };
  const out = pushEvents([mk("2026-08-01T00:00:00Z"), mk("2026-10-20T00:00:00Z"), mk("2025-09-01T00:00:00Z")], [], { now, phoneCols: [office, mobile] });
  assert.equal(out.length, 2); // 1년 넘은 줄은 정리
  assert.equal(out[0].row[office], ""); assert.equal(out[0].row[mobile], ""); // 30일 지남 → 번호만 비움
  assert.equal(out[0].row[COLUMNS.indexOf("단지명")], "x");
  assert.equal(out[1].row[office], "x"); // 30일 안 → 그대로
});
