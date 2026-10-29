// J 다시 올린 매물 묶기 · K 실거래 이름 후보 · L 카톡 문장 끝 자르기(2026-10-26)
import { test } from "node:test";
import assert from "node:assert/strict";
import { compareComplex, filterEvents } from "../extension/lib/compare.js";
import { cutAtSentence } from "../extension/lib/weekly.js";
import { nameMatches, similarAptNames, summarizeTrades } from "../lib/trades.ts";

const it = (no: string, extra: Record<string, unknown> = {}) => ({ no, complexNo: "2934", dong: "209동", tradeType: "A1", tradeName: "매매", price: 40000, rent: null, priceText: "4억", area: 58, floor: "5/20", realtor: "현재공인중개사사무소", ...extra });
const T0 = Date.parse("2026-10-01T00:00:00Z"), T1 = Date.parse("2026-10-26T10:00:00Z");

test("J: 번호만 바뀐 같은 매물 → 「다시 올림」 1건, 처음 발견일 이어받기, 알림 제외", () => {
  const s0 = compareComplex(null, [it("A"), it("B", { dong: "210동" })], { now: T0 }).state;
  const r = compareComplex(s0, [it("A2"), it("B", { dong: "210동" })], { now: T1 });
  assert.deepEqual(r.events.map((e) => e.type), ["relisted"]);
  assert.equal(r.events[0].prevNo, "A");
  assert.equal(r.state.items.A2.firstSeen, new Date(T0).toISOString());
  assert.equal(filterEvents(r.events, { notifyNew: true, notifyGone: true }).length, 0);
});

test("J: 가격이나 중개사가 다르면 묶지 않음", () => {
  const s0 = compareComplex(null, [it("A")], { now: T0 }).state;
  assert.deepEqual(compareComplex(s0, [it("A2", { price: 39000 })], { now: T1 }).events.map((e) => e.type).sort(), ["gone", "new"]);
  assert.deepEqual(compareComplex(s0, [it("A2", { realtor: "다른공인중개사" })], { now: T1 }).events.map((e) => e.type).sort(), ["gone", "new"]);
});

test("J: 끝까지 못 읽은 회차는 사라짐 판단이 없으니 그대로 신규", () => {
  const s0 = compareComplex(null, [it("A")], { now: T0 }).state;
  assert.deepEqual(compareComplex(s0, [it("A2")], { now: T1, complete: false }).events.map((e) => e.type), ["new"]);
});

test("K: 글자가 많이 겹치는 국토부 단지 이름 후보", () => {
  const trades = ["백송마을8단지(선경,코오롱)", "백송마을7단지(대림)", "일산요진와이시티", "선경코오롱", "백송마을8단지(선경,코오롱)"].map((aptNm) => ({ aptNm }));
  const r = similarAptNames("백송선경,코오롱8단지", trades as never);
  assert.ok(r.includes("백송마을8단지(선경,코오롱)"));
  assert.ok(r.includes("선경코오롱"));
  assert.equal(r.includes("일산요진와이시티"), false);
  assert.equal(new Set(r).size, r.length);
});

test("K 후속: 시공사 여럿인 단지는 국토부 「마을(시공사)」 두 이름을 모두 맞추고, 다른 마을·다른 단지는 안 맞춤", () => {
  assert.equal(nameMatches("백송선경,코오롱8단지", "백송마을(선경)"), true);
  assert.equal(nameMatches("백송선경,코오롱8단지", "백송마을(코오롱)"), true);
  assert.equal(nameMatches("백송선경,코오롱8단지", "강촌마을(코오롱)"), false);
  assert.equal(nameMatches("백송선경,코오롱8단지", "중산마을2(코오롱)"), false);
  assert.equal(nameMatches("흰돌6단지라이프", "강촌마을(라이프)"), false);
  // 쉼표 없는 이름은 기존 규칙 그대로(「백송대림」 ↔ 「백송마을5단지(대림)」)
  assert.equal(nameMatches("백송대림", "백송마을5단지(대림)"), true);
  assert.equal(nameMatches("백송대림", "백송마을(선경)"), false);
  const trades = ["백송마을(선경)", "백송마을(코오롱)", "강촌마을(코오롱)"].map((aptNm) => ({ aptNm, area: 84.9, price: 60000, ymd: "20261001", floor: "5", canceled: false }));
  assert.equal(summarizeTrades(trades, "백송선경,코오롱8단지").bands[0].count, 2);
});

test("L: 200자를 넘으면 문장 끝에서 자르고 「…」", () => {
  const s = "📅 주간 리포트\n" + "가".repeat(80) + "였습니다. " + "나".repeat(150);
  const out = cutAtSentence(s, 200);
  assert.ok(out.length <= 200);
  assert.ok(out.endsWith("였습니다.…"));
  assert.equal(cutAtSentence("짧은 글", 200), "짧은 글");
  assert.equal(cutAtSentence("다".repeat(300), 200).length, 200);
});
