import { test } from "node:test";
import assert from "node:assert/strict";
import { articleUrl, isWatchableUrl, matchesTarget, normalizeArticle, parseKoreanPrice } from "../extension/lib/listing.js";
import { compareTarget, filterEvents } from "../extension/lib/compare.js";
import { buildKakaoText, buildSummary, kakaoLinkFor } from "../extension/lib/notify.js";
import { kindsText, parseWatchUrl } from "../src/lib/watchTargets.ts";

const BASE = "https://new.land.naver.com/offices?ms=2AJhyo,3zk74s,16&a=SG&e=RETAIL";
const RAW = { articleNo: "111", realEstateTypeCode: "SG", realEstateTypeName: "상가", tradeTypeCode: "B2", tradeTypeName: "월세", dealOrWarrantPrc: "5,000", rentPrc: "380", area1: 163, area2: 108, floorInfo: "1/6", articleConfirmYmd: "20261030", realtorName: "역삼공인중개사사무소02)555-1234" };

test("금액 글자를 만 원으로 읽는다", () => {
  assert.equal(parseKoreanPrice("63억 3,000"), 633000);
  assert.equal(parseKoreanPrice("43억"), 430000);
  assert.equal(parseKoreanPrice("5,000"), 5000);
  assert.equal(parseKoreanPrice(""), null);
});

test("유형별 면적 기준을 맞춘다", () => {
  const sg = normalizeArticle(RAW, "t1", BASE);
  assert.equal(sg.area, 108);
  assert.equal(sg.areaLabel, "전용");
  assert.equal(sg.subArea, 163);
  const gm = normalizeArticle({ ...RAW, realEstateTypeCode: "GM", area1: 253, area2: 676 }, "t1", BASE);
  assert.equal(gm.area, 676);
  assert.equal(gm.areaLabel, "연면적");
  assert.equal(gm.subArea, 253);
  const tj = normalizeArticle({ ...RAW, realEstateTypeCode: "TJ", area1: 347, area2: 0 }, "t1", BASE);
  assert.equal(tj.area, 347);
  assert.equal(tj.areaLabel, "토지");
});

test("월세 표기와 전화번호 제거, 매물 주소", () => {
  const i = normalizeArticle(RAW, "t1", BASE);
  assert.equal(i.priceText, "5,000만 / 월 380만");
  assert.ok(!/\d{3,}-\d{4}/.test(i.realtor));
  assert.match(articleUrl(BASE, "111"), /articleNo=111/);
});

test("감시 조건으로 거른다", () => {
  const i = normalizeArticle(RAW, "t1", BASE);
  assert.equal(matchesTarget(i, { trade_types: ["A1"] }), false);
  assert.equal(matchesTarget(i, { trade_types: ["B2"], price_max: 4000 }), false);
  assert.equal(matchesTarget(i, { trade_types: ["B2"], area_min: 100, area_max: 200 }), true);
  assert.equal(matchesTarget(i, { area_min: 200 }), false);
});

const item = (over = {}) => ({ ...normalizeArticle(RAW, "t1", BASE), ...over });

test("첫 수집은 기준만 저장한다", () => {
  const r = compareTarget(undefined, [item()]);
  assert.equal(r.firstRun, true);
  assert.equal(r.events.length, 0);
});

test("가격 내림·오름·신규·사라짐", () => {
  const s = compareTarget(undefined, [item(), item({ no: "222" })]).state;
  const r = compareTarget(s, [item({ price: 4000, priceText: "4,000만" }), item({ no: "333", price: 9000, priceText: "9,000만" })]);
  const types = r.events.map((e) => e.type).sort();
  assert.deepEqual(types, ["gone", "new", "priceDown"]);
  assert.equal(r.events.find((e) => e.type === "priceDown").prevPriceText, "5,000만 / 월 380만");
});

test("끝까지 못 읽은 회차는 사라짐을 판단하지 않고, 옛 확인 매물을 신규로 보지 않는다", () => {
  const now = Date.parse("2026-10-31T03:00:00Z");
  const s = compareTarget(undefined, [item({ no: "1" })], { now }).state;
  const r = compareTarget(s, [item({ no: "2", confirmYmd: "20260901" }), item({ no: "3", confirmYmd: "20261030" })], { now, complete: false });
  assert.deepEqual(r.events.map((e) => [e.type, e.item.no]), [["new", "3"]]);
  assert.ok(r.state.items["1"], "못 본 매물은 유지");
  assert.ok(r.state.items["2"], "옛 매물은 기준에 저장");
});

test("끝까지 못 읽은 기준 뒤 끝까지 읽어도 옛 매물을 신규로 보지 않는다", () => {
  const now = Date.parse("2026-10-31T03:00:00Z");
  const s = compareTarget(undefined, [item({ no: "1" })], { now, complete: false }).state;
  const r = compareTarget(s, [item({ no: "1" }), item({ no: "2", confirmYmd: "20260901" }), item({ no: "3", confirmYmd: "20261030", price: 7000 })], { now, complete: true });
  assert.deepEqual(r.events.map((e) => [e.type, e.item.no]), [["new", "3"]]);
  const next = compareTarget(r.state, [item({ no: "1" }), item({ no: "2", confirmYmd: "20260901" }), item({ no: "3", confirmYmd: "20261030", price: 7000 }), item({ no: "4", confirmYmd: "20260901", price: 8000 })], { now, complete: true });
  assert.deepEqual(next.events.map((e) => [e.type, e.item.no]), [["new", "4"]]);
});

test("같은 매물을 다시 올리면 알리지 않는다", () => {
  const s = compareTarget(undefined, [item({ no: "1" })]).state;
  const r = compareTarget(s, [item({ no: "9" })]);
  assert.deepEqual(r.events.map((e) => e.type), ["relisted"]);
  assert.equal(filterEvents(r.events, { notifyNew: true, notifyDrop: true, notifyRise: true, notifyGone: true }).length, 0);
});

test("알림 기준을 지킨다", () => {
  const ev = [{ type: "new" }, { type: "priceDown" }, { type: "priceUp" }, { type: "gone" }];
  assert.deepEqual(filterEvents(ev, { notifyNew: true, notifyDrop: true, notifyRise: false, notifyGone: false }).map((e) => e.type), ["new", "priceDown"]);
});

test("알림 글과 카톡 제한", () => {
  const per = [{ name: "역삼동 상가", total: 3, firstRun: false, complete: false, pagesRead: 15, events: [{ type: "new", item: item() }] }];
  const text = buildSummary(per);
  assert.match(text, /역삼동 상가/);
  assert.match(text, /앞 15페이지만/);
  assert.match(text, /articleNo=111/);
  assert.ok(buildKakaoText(per).length <= 200);
  assert.match(buildKakaoText(per), /신규 1/);
  assert.match(kakaoLinkFor(per), /\/api\/go\?u=/);
});

test("감시 주소 검사", () => {
  assert.equal(isWatchableUrl(BASE), true);
  assert.equal(isWatchableUrl("https://new.land.naver.com/complexes/1"), false);
  assert.equal(isWatchableUrl("https://evil.example.com/offices?ms=1&a=SG"), false);
  const p = parseWatchUrl(`${BASE}&articleNo=99`);
  assert.equal(p.kinds, "SG");
  assert.ok(!p.url.includes("articleNo"));
  assert.equal(parseWatchUrl("https://new.land.naver.com/offices?ms=1&a=APT"), null);
  assert.equal(kindsText("SG:TJ"), "상가·토지");
});

test("시세 대비와 후보 점수", async () => {
  const { gapText, marketGap, scoreListing, daysSince } = await import("../extension/lib/score.js");
  const it = item({ tradeType: "A1", price: 100000, area: 100 });
  const g = marketGap(it, { SG: { median: 4000, count: 12, scope: "동" } });
  assert.equal(g.pct, -17);
  assert.equal(gapText(g), "-17%(동 12건)");
  assert.equal(marketGap(item(), { SG: { median: 4000, count: 12, scope: "동" } }), null, "월세는 비교 안 함");
  assert.equal(marketGap(it, { SG: null }), null);
  const s = scoreListing({ gap: g, drops: 1, ageDays: 40 });
  assert.equal(s.score, 60);
  assert.equal(s.candidate, true);
  assert.equal(s.reasons.length, 3);
  assert.equal(scoreListing({ gap: { pct: 5 } }).candidate, false);
  assert.equal(scoreListing({ drops: 9 }).score, 30);
  assert.equal(daysSince(new Date(Date.now() - 3 * 86400000).toISOString()), 3);
});

test("가격을 내릴 때마다 횟수를 센다", () => {
  let s = compareTarget(undefined, [item({ no: "1", price: 9000 })]).state;
  s = compareTarget(s, [item({ no: "1", price: 8000 })]).state;
  s = compareTarget(s, [item({ no: "1", price: 8500 })]).state;
  s = compareTarget(s, [item({ no: "1", price: 7000 })]).state;
  assert.equal(s.items["1"].drops, 2);
});

test("실거래 시세 요약", async () => {
  const { summarizeMarket } = await import("../src/lib/trades/market.ts");
  const row = (over) => ({ kind: "building", building_type: "집합", category: "판매", umd_nm: "역삼동", price_per_pyeong: 100, is_share: false, cancelled: false, ...over });
  const rows = [1, 2, 3, 4, 5].map((n) => row({ price_per_pyeong: n * 100 }));
  assert.deepEqual(summarizeMarket(rows, "역삼동").SG, { median: 300, count: 5, scope: "동" });
  assert.equal(summarizeMarket(rows, "대치동").SG.scope, "시군구");
  assert.equal(summarizeMarket(rows.slice(0, 4), "역삼동").SG, null);
  const noisy = [...rows, row({ price_per_pyeong: 99999, is_share: true }), row({ price_per_pyeong: 99999, cancelled: true }), row({ price_per_pyeong: 99999, category: "숙박" }), row({ price_per_pyeong: 99999, building_type: "일반" })];
  assert.equal(summarizeMarket(noisy, "역삼동").SG.median, 300);
  assert.equal(summarizeMarket(noisy, "역삼동").GM, null);
  const land = [1, 2, 3, 4, 5].map((n) => row({ kind: "land", building_type: null, category: "대", price_per_pyeong: n * 10 }));
  assert.equal(summarizeMarket([...land, row({ kind: "land", building_type: null, category: "도로", price_per_pyeong: 1 })], "역삼동").TJ.median, 30);
});
