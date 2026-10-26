// 실거래가 비교(2026-10-25, v1.19) — 응답 읽기·단지 이름 맞추기·면적대 중간값·호가 비교·위치 코드 찾기 시험
import { test } from "node:test";
import assert from "node:assert/strict";
import { compareToTrades, nameMatches, normalizeAptName, parseTradeResponse, recentMonths, summarizeTrades } from "../lib/trades.ts";
import { compareToTrades as extCompare, gapText } from "../extension/lib/tradeCompare.js";
import { findCortarNo } from "../extension/lib/collector.js";
import { summarizeTable } from "../extension/lib/stats.js";
import { COLUMNS } from "../extension/lib/sheet.js";

const XML = `<?xml version="1.0"?><response><header><resultCode>000</resultCode><resultMsg>OK</resultMsg></header><body><items>
<item><aptNm>요진와이시티</aptNm><dealAmount>   80,000</dealAmount><dealYear>2026</dealYear><dealMonth>9</dealMonth><dealDay>3</dealDay><excluUseAr>59.97</excluUseAr><floor>30</floor><cdealType> </cdealType></item>
<item><aptNm>요진와이시티</aptNm><dealAmount>84,000</dealAmount><dealYear>2026</dealYear><dealMonth>10</dealMonth><dealDay>1</dealDay><excluUseAr>59.97</excluUseAr><floor>40</floor><cdealType></cdealType></item>
<item><aptNm>요진와이시티</aptNm><dealAmount>99,000</dealAmount><dealYear>2026</dealYear><dealMonth>10</dealMonth><dealDay>2</dealDay><excluUseAr>59.97</excluUseAr><floor>10</floor><cdealType>O</cdealType></item>
<item><aptNm>백송마을5단지</aptNm><dealAmount>45,000</dealAmount><dealYear>2026</dealYear><dealMonth>8</dealMonth><dealDay>20</dealDay><excluUseAr>84.9</excluUseAr><floor>7</floor></item>
</items></body></response>`;

test("국토부 응답 읽기: XML·JSON, 금액 쉼표·공백, 해제 거래 표시, 오류 코드", () => {
  const x = parseTradeResponse(XML);
  assert.equal(x.trades.length, 4);
  assert.deepEqual([x.trades[0].price, x.trades[0].ymd, x.trades[2].canceled], [80000, "20260903", true]);
  const j = parseTradeResponse(JSON.stringify({ response: { header: { resultCode: "000" }, body: { items: { item: { aptNm: "A", dealAmount: "50,000", dealYear: 2026, dealMonth: 1, dealDay: 9, excluUseAr: 84.1 } } } } }));
  assert.equal(j.trades[0].price, 50000);
  assert.match(parseTradeResponse("<OpenAPI_ServiceResponse><cmmMsgHeader><returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg></cmmMsgHeader></OpenAPI_ServiceResponse>").error!, /NOT_REGISTERED/);
});

test("단지 이름 맞추기: 띄어쓰기·「아파트」·괄호 무시, 포함 관계", () => {
  assert.equal(normalizeAptName("일산 요진와이시티(주거복합)"), "일산요진와이시티");
  assert.equal(nameMatches("일산요진와이시티(주거복합)", "요진와이시티"), true);
  assert.equal(nameMatches("백송풍림,삼호", "백송마을5단지"), false);
  // 2026-10-26 보강: 「마을·○단지」·괄호 안 단지명
  assert.equal(nameMatches("백송대림", "백송마을5단지(대림)"), true);
  assert.equal(nameMatches("백송풍림,삼호", "백송마을풍림삼호"), true);
  assert.equal(nameMatches("흰돌3단지국제,한진", "흰돌마을3단지(국제한진)"), true);
  assert.equal(nameMatches("백송대림", "백송마을7단지(한신)"), false);
});

test("면적대 중간값: 해제 거래 빼고 ㎡당, 매물 비교 ±3㎡", () => {
  const { trades } = parseTradeResponse(XML);
  const s = summarizeTrades(trades, "일산요진와이시티(주거복합)");
  assert.equal(s.matchedName, "요진와이시티");
  assert.equal(s.bands.length, 1);
  assert.equal(s.bands[0].area, 60);
  assert.equal(s.bands[0].count, 2); // 99,000 해제 거래 제외
  assert.equal(s.bands[0].medianPerM2, Math.round(((80000 + 84000) / 2) / 59.97));
  const c = compareToTrades(90000, 59, s.bands)!;
  assert.equal(c.pct, Math.round(((90000 / 59) / s.bands[0].medianPerM2 - 1) * 100));
  assert.equal(compareToTrades(90000, 84, s.bands), null); // 면적대가 멀면 비교 안 함
  // 확장 쪽 같은 규칙
  assert.equal(extCompare(90000, 59, s.bands).pct, c.pct);
  assert.equal(gapText(8), "+8%"); assert.equal(gapText(-5), "-5%"); assert.equal(gapText(null), "");
});

test("최근 6개월: 이번 달부터 거꾸로, 해 넘김", () => {
  assert.deepEqual(recentMonths(new Date("2026-02-10T00:00:00Z"), 4), ["202602", "202601", "202512", "202511"]);
});

test("위치 코드 찾기: 응답 안쪽 어디든 10자리 cortarNo", () => {
  assert.equal(findCortarNo({ complexDetail: { address: "x", cortarNo: "4128510600" } }), "4128510600");
  assert.equal(findCortarNo({ a: { b: { cortarNo: 12 } } }), null);
});

test("통계: 단지별 매매 실거래 대비 평균", () => {
  const row = (gap: string) => { const r = COLUMNS.map(() => ""); r[COLUMNS.indexOf("단지명")] = "A"; r[COLUMNS.indexOf("거래 종류")] = "매매"; r[COLUMNS.indexOf("가격(만 원)")] = "8억"; r[COLUMNS.indexOf("전용면적(㎡)")] = "59"; r[COLUMNS.indexOf("상태")] = "유지"; r[COLUMNS.indexOf("실거래 대비")] = gap; return r; };
  const s = summarizeTable(COLUMNS, [row("+8%"), row("-2%"), row("")], "x");
  assert.equal(s.complexes[0].trades["매매"].tradeGapAvg, 3);
  assert.equal(s.complexes[0].trades["매매"].tradeGapN, 2);
});
