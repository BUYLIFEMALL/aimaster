// 3단계 확장 수집 엔진 순수 함수 시험(모의 응답은 0단계 사전 검증의 실제 응답 모양) — node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatManwon, matchesTarget, normalizeArticle, parseKoreanPrice } from "../extension/lib/listing.js";
import { compareComplex, filterEvents } from "../extension/lib/compare.js";
import { isBlockedStatus, isBlockedText, isRuleMismatch, kstDate, shouldRunScheduled } from "../extension/lib/guard.js";
import { toCsv, toTable, toXlsx, zipStored } from "../extension/lib/sheet.js";
import { ALERT_PREFIX, buildSummary } from "../extension/lib/telegram.js";

const raw = (no: string, price: string, extra: Record<string, unknown> = {}) => ({
  articleNo: no, articleName: "백송건영", buildingName: "101동", tradeTypeCode: "A1", tradeTypeName: "매매",
  dealOrWarrantPrc: price, area2: 84, areaName: "107A", floorInfo: "4/15", direction: "남향",
  articleFeatureDesc: "올수리", articleConfirmYmd: "20261024", realtorName: "백송공인중개사사무소031)917-1234",
  ...extra,
});

test("가격 글자 → 만 원 숫자, 다시 글자", () => {
  assert.equal(parseKoreanPrice("3억 9,800"), 39800);
  assert.equal(parseKoreanPrice("12억"), 120000);
  assert.equal(parseKoreanPrice("9,800"), 9800);
  assert.equal(parseKoreanPrice(""), null);
  assert.equal(parseKoreanPrice("협의"), null);
  assert.equal(formatManwon(39800), "3억 9,800");
  assert.equal(formatManwon(120000), "12억");
  assert.equal(formatManwon(9800), "9,800");
});

test("매물 정리: 개인 정보 없음, 상호 전화 지움, 월세 표시", () => {
  const a = normalizeArticle(raw("1", "3억 9,800"), "10981", "백송건영");
  assert.equal(a.price, 39800);
  assert.equal(a.realtor, "백송공인중개사사무소");
  assert.equal(a.area, 84);
  assert.ok(!JSON.stringify(a).includes("917-1234"));
  const m = normalizeArticle(raw("2", "5,000", { tradeTypeCode: "B2", tradeTypeName: "월세", rentPrc: "120" }), "10981", "");
  assert.equal(m.priceText, "5,000 / 120");
});

test("감시 조건 거르기", () => {
  const a = normalizeArticle(raw("1", "3억 9,800"), "1", "");
  assert.ok(matchesTarget(a, { trade_types: ["A1"] }));
  assert.ok(!matchesTarget(a, { trade_types: ["B1"] }));
  assert.ok(matchesTarget(a, { price_min: 39800, price_max: 39800 }));
  assert.ok(!matchesTarget(a, { price_max: 30000 }));
  assert.ok(!matchesTarget(a, { area_min: 100 }));
  assert.ok(matchesTarget(a, { area_min: 59, area_max: 84 }));
});

test("비교: 첫 수집은 기준만, 다음 회차 신규·가격 내림·사라짐, 같은 일은 1번만", () => {
  const t0 = Date.parse("2026-10-25T00:00:00Z");
  const first = compareComplex(null, [normalizeArticle(raw("1", "4억"), "1", ""), normalizeArticle(raw("2", "5억"), "1", "")], { now: t0 });
  assert.equal(first.firstRun, true);
  assert.equal(first.events.length, 0);

  const second = compareComplex(first.state, [normalizeArticle(raw("1", "3억 9,000"), "1", ""), normalizeArticle(raw("3", "6억"), "1", "")], { now: t0 + 3600e3 });
  const types = second.events.map((e) => e.type).sort();
  assert.deepEqual(types, ["gone", "new", "priceDown"]);
  assert.equal(second.events.find((e) => e.type === "priceDown")?.prevPriceText, "4억");

  const third = compareComplex(second.state, [normalizeArticle(raw("1", "3억 9,000"), "1", ""), normalizeArticle(raw("3", "6억"), "1", "")], { now: t0 + 7200e3 });
  assert.equal(third.events.length, 0, "같은 매물·같은 가격이면 다시 알리지 않음");
});

test("비교: 끝까지 못 읽은 회차는 사라짐 판단 보류", () => {
  const first = compareComplex(null, [normalizeArticle(raw("1", "4억"), "1", "")]);
  const partial = compareComplex(first.state, [], { complete: false });
  assert.equal(partial.events.length, 0);
  assert.ok(partial.state.items["1"]);
});

test("알림 기준 거르기", () => {
  const ev = [{ type: "new" }, { type: "priceDown" }, { type: "priceUp" }, { type: "gone" }] as never[];
  assert.equal(filterEvents(ev, { notifyNew: true, notifyPriceDrop: true, notifyPriceChange: false, notifyGone: false }).length, 2);
  assert.equal(filterEvents(ev, { notifyNew: false, notifyPriceDrop: false, notifyPriceChange: true, notifyGone: true }).length, 3);
});

test("멈춤 판정", () => {
  assert.ok([401, 403, 429].every(isBlockedStatus));
  assert.ok(!isBlockedStatus(200));
  assert.ok(isBlockedText("자동입력 방지 문자를 입력해 주세요"));
  assert.ok(!isBlockedText("매물 13건"));
  assert.ok(!isRuleMismatch({ articleList: [{ articleNo: "1" }], isMoreData: false }, {}));
  assert.ok(isRuleMismatch({ list: [] }, {}));
  assert.ok(isRuleMismatch({ articleList: [{ id: 1 }] }, {}));
});

test("예약 판정: 꺼짐·그날 멈춤·시간대·차례·밀린 회차 1번", () => {
  const now = Date.parse("2026-10-25T03:00:00Z"); // 한국 12시
  const schedule = { enabled: true, intervalMinutes: 60, startHour: 9, endHour: 18 };
  assert.equal(shouldRunScheduled({ schedule: { ...schedule, enabled: false }, lastRunAt: null, stoppedDate: null, now }).run, false);
  assert.equal(shouldRunScheduled({ schedule, lastRunAt: null, stoppedDate: kstDate(now), now }).run, false);
  assert.equal(shouldRunScheduled({ schedule: { ...schedule, startHour: 22, endHour: 6 }, lastRunAt: null, stoppedDate: null, now }).run, false);
  assert.equal(shouldRunScheduled({ schedule, lastRunAt: new Date(now - 30 * 60e3).toISOString(), stoppedDate: null, now }).run, false);
  // 크롬이 하루 꺼져 있었어도 한 번만 돈다(마지막 시각만 보므로 몰아서 하지 않음)
  assert.equal(shouldRunScheduled({ schedule, lastRunAt: new Date(now - 24 * 3600e3).toISOString(), stoppedDate: "2026-10-24", now }).run, true);
});

test("파일: CSV·xlsx 모양, 개인 정보 칸 없음", () => {
  const item = normalizeArticle(raw("1", "4억"), "10981", "백송건영");
  const table = toTable([{ item, status: "new", firstSeen: "2026-10-25T00:00:00Z" }]);
  const csv = toCsv(table);
  assert.ok(csv.startsWith("﻿단지명,"));
  assert.ok(csv.includes("https://new.land.naver.com/complexes/10981?articleNo=1"));
  assert.ok(!/전화|주소지|대표자/.test(csv.split("\r\n")[0]));
  const x = toXlsx(table);
  assert.equal(x[0], 0x50); // 'P'
  assert.equal(x[1], 0x4b); // 'K'
  const text = new TextDecoder().decode(x);
  assert.ok(text.includes("xl/worksheets/sheet1.xml") && text.includes("백송건영"));
  assert.equal(zipStored([["a.txt", new TextEncoder().encode("hi")]]).length, 30 + 5 + 2 + 46 + 5 + 22);
});

test("텔레그램 요약: 머리말·건수·링크·지난 실패 안내", () => {
  const item = normalizeArticle(raw("1", "3억 9,000"), "10981", "백송건영");
  const text = buildSummary(
    [{ name: "백송건영", total: 13, events: [{ type: "priceDown", item, prevPriceText: "4억" }], firstRun: false, complete: true }],
    { failedBefore: true, now: new Date("2026-10-25T03:00:00Z") },
  );
  assert.ok(text.startsWith(ALERT_PREFIX));
  assert.ok(text.includes("지난 회차 알림"));
  assert.ok(text.includes("📉 가격 내림 1"));
  assert.ok(text.includes("(이전 4억)"));
  assert.ok(text.includes("articleNo=1"));
});
