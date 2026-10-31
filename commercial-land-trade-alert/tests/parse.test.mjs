import { test } from "node:test";
import assert from "node:assert/strict";
import { medianOrNull, molitItems, monthKey, parseTrades, pricePerPyeong } from "../src/lib/trades/parse.ts";
import { DEFAULT_PREFS, alertText, formatManwon, matchesPrefs } from "../src/lib/trades/prefs.ts";

const NRG = { buildYear: 1989, buildingAr: 645.08, buildingType: "일반", buildingUse: "제2종근린생활", cdealDay: " ", cdealType: " ", dealAmount: "580,000", dealDay: 18, dealMonth: 9, dealYear: 2026, dealingGbn: "중개거래", floor: " ", jibun: "1***", landUse: "제2종일반주거", plottageAr: 264.4, shareDealingType: " ", umdNm: "개포동" };
const LAND = { cdealDay: " ", cdealType: " ", dealAmount: "2,000", dealArea: 3.31, dealDay: 28, dealMonth: 8, dealYear: 2026, dealingGbn: "직거래", jibun: "6**", jimok: "도로", landUse: "제2종일반주거지역", shareDealingType: "지분", umdNm: "역삼동" };

test("상업업무용 줄을 저장 형태로 바꾼다", () => {
  const [r] = parseTrades("building", [NRG], "11680", "강남구");
  assert.equal(r.amount_manwon, 580000);
  assert.equal(r.deal_date, "2026-09-18");
  assert.equal(r.jibun_masked, true);
  assert.equal(r.category, "제2종근린생활");
  assert.equal(r.floor, null);
  assert.equal(r.is_share, false);
  assert.equal(r.cancelled, false);
  assert.equal(r.area_m2, 645.08);
  assert.equal(r.plot_m2, 264.4);
  assert.ok(r.price_per_pyeong > 2900 && r.price_per_pyeong < 3000);
});

test("같은 내용의 토지 지분 거래는 순번으로 모두 남는다", () => {
  const rows = parseTrades("land", [LAND, LAND, LAND], "11680", "강남구");
  assert.equal(new Set(rows.map((r) => r.trade_key)).size, 3);
  assert.equal(rows[0].is_share, true);
  assert.equal(rows[0].building_type, null);
});

test("같은 응답을 다시 받아도 키가 같다", () => {
  const a = parseTrades("land", [LAND, LAND], "11680", "강남구").map((r) => r.trade_key);
  const b = parseTrades("land", [LAND, LAND], "11680", "강남구").map((r) => r.trade_key);
  assert.deepEqual(a, b);
});

test("취소되어도 키가 그대로라 같은 줄이 갱신된다", () => {
  const before = parseTrades("building", [NRG], "11680", "강남구")[0];
  const after = parseTrades("building", [{ ...NRG, cdealType: "O", cdealDay: "26.10.29" }], "11680", "강남구")[0];
  assert.equal(before.trade_key, after.trade_key);
  assert.equal(after.cancelled, true);
  assert.equal(after.cancelled_on, "26.10.29");
});

test("금액이나 날짜가 없는 줄은 버린다", () => {
  assert.equal(parseTrades("land", [{ ...LAND, dealAmount: " " }], "11680", "강남구").length, 0);
  assert.equal(parseTrades("land", [{ ...LAND, dealDay: "" }], "11680", "강남구").length, 0);
});

test("집합 건물은 지번 공개로 표시한다", () => {
  const [r] = parseTrades("building", [{ ...NRG, jibun: "123-4", buildingType: "집합", floor: 3, plottageAr: " " }], "11680", "강남구");
  assert.equal(r.jibun_masked, false);
  assert.equal(r.plot_m2, null);
  assert.equal(r.floor, "3");
});

test("한 건이면 객체, 없으면 빈 문자열로 와도 읽는다", () => {
  assert.equal(molitItems({ response: { body: { items: { item: NRG }, totalCount: 1 } } }).items.length, 1);
  const none = molitItems({ response: { body: { items: "", totalCount: 0 } } });
  assert.equal(none.items.length, 0);
  assert.equal(none.total, 0);
});

test("중간값은 5건 미만이면 내지 않는다", () => {
  assert.equal(medianOrNull([1, 2, 3, 4]), null);
  assert.equal(medianOrNull([1, 2, 3, 4, 100]), 3);
  assert.equal(medianOrNull([1, 2, 3, 4, 5, 6]), 3.5);
});

test("면적이 없으면 평당가를 내지 않는다", () => {
  assert.equal(pricePerPyeong(100, null), null);
  assert.equal(pricePerPyeong(100, 0), null);
});

test("달 계산은 한국 시간 기준이고 해를 넘긴다", () => {
  assert.equal(monthKey(new Date("2026-10-31T16:00:00Z"), 0), "202611");
  assert.equal(monthKey(new Date("2026-01-15T00:00:00Z"), 2), "202511");
});

test("기본 조건은 숙박·도로·지분·취소를 뺀다", () => {
  const base = { kind: "building", category: "판매", amount_manwon: 10000, area_m2: 100, is_share: false, cancelled: false };
  assert.equal(matchesPrefs(base, DEFAULT_PREFS), true);
  assert.equal(matchesPrefs({ ...base, category: "숙박" }, DEFAULT_PREFS), false);
  assert.equal(matchesPrefs({ ...base, kind: "land", category: "도로" }, DEFAULT_PREFS), false);
  assert.equal(matchesPrefs({ ...base, is_share: true }, DEFAULT_PREFS), false);
  assert.equal(matchesPrefs({ ...base, cancelled: true }, { ...DEFAULT_PREFS, include_share: true }), false);
});

test("금액·면적 조건을 지키고 면적이 없으면 면적 조건에서 뺀다", () => {
  const base = { kind: "land", category: "대", amount_manwon: 10000, area_m2: null, is_share: false, cancelled: false };
  assert.equal(matchesPrefs(base, { ...DEFAULT_PREFS, max_amount: 5000 }), false);
  assert.equal(matchesPrefs(base, { ...DEFAULT_PREFS, min_area: 10 }), false);
  assert.equal(matchesPrefs(base, { ...DEFAULT_PREFS, kinds: ["building"] }), false);
});

test("금액 표기", () => {
  assert.equal(formatManwon(580000), "58억");
  assert.equal(formatManwon(58500), "5억 8,500만");
  assert.equal(formatManwon(2000), "2,000만");
  assert.equal(formatManwon(null), "-");
});

test("알림 문구에 지역·금액·지분이 들어간다", () => {
  const t = alertText([{ kind: "land", sgg_nm: "강남구", umd_nm: "역삼동", category: "대", amount_manwon: 2000, area_m2: 3.31, deal_date: "2026-08-28", is_share: true }], "https://x");
  assert.match(t, /새 실거래 1건/);
  assert.match(t, /강남구 역삼동 토지\(대\) 2,000만/);
  assert.match(t, /지분/);
});
