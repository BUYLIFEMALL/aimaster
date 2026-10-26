// EC-W7(2026-10-26) — 관세청 과세환율 읽기·관세 계산 순서(외부 호출·DB 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

async function load(entry) {
  const out = await build({ entryPoints: [entry], bundle: true, write: false, format: "esm", platform: "node" });
  return import("data:text/javascript;base64," + Buffer.from(out.outputFiles[0].text).toString("base64"));
}
const fx = await load("lib/customs/fxParse.ts");
const { calcMargin, MARGIN_DEFAULTS: M } = await load("lib/margin.ts");

// 공식 안내의 항목 이름으로 만든 예시 응답(감싸는 요소 이름은 임의 — 읽기 방식이 이름에 기대지 않는지 확인)
const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?><response><header><resultCode>00</resultCode><resultMsg>정상서비스</resultMsg></header>
<body><items>
<item><cntySgn>US</cntySgn><mtryUtNm>US Dollar</mtryUtNm><fxrt>1,385.20</fxrt><currSgn>USD</currSgn><aplyBgnDt>20261025</aplyBgnDt><imexTp>2</imexTp></item>
<item><cntySgn>CN</cntySgn><mtryUtNm>Yuan Renminbi</mtryUtNm><fxrt>194.31</fxrt><currSgn>CNY</currSgn><aplyBgnDt>20261025</aplyBgnDt><imexTp>2</imexTp></item>
<item><cntySgn>JP</cntySgn><mtryUtNm>Japanese Yen (100)</mtryUtNm><fxrt>912.5</fxrt><currSgn>JPY</currSgn><aplyBgnDt>20261025</aplyBgnDt><imexTp>2</imexTp></item>
<item><cntySgn>US</cntySgn><mtryUtNm>US Dollar</mtryUtNm><fxrt>1,380.00</fxrt><currSgn>USD</currSgn><aplyBgnDt>20261025</aplyBgnDt><imexTp>1</imexTp></item>
<item><cntySgn>XX</cntySgn><mtryUtNm>Broken</mtryUtNm><fxrt>abc</fxrt><currSgn>XXX</currSgn><aplyBgnDt>20261025</aplyBgnDt><imexTp>2</imexTp></item>
</items></body></response>`;

test("과세환율 응답: 수입(2)만, 쉼표 숫자, 100엔 단위는 1엔당으로, 이상한 줄은 버림", () => {
  const r = fx.parseCustomsFxXml(SAMPLE);
  assert.equal(r.resultCode, "00");
  assert.deepEqual(r.rows.map((x) => x.currency), ["USD", "CNY", "JPY"]);
  assert.equal(r.rows[0].rateKrw, 1385.2);
  assert.equal(r.rows[0].applyStart, "2026-10-25");
  assert.equal(r.rows[2].unit, 100);
  assert.equal(r.rows[2].rateKrw, 9.125);
});

test("오류 응답·빈 응답은 줄 없이 결과 코드만", () => {
  const r = fx.parseCustomsFxXml("<response><header><resultCode>30</resultCode><resultMsg>SERVICE KEY IS NOT REGISTERED</resultMsg></header></response>");
  assert.equal(r.resultCode, "30");
  assert.equal(r.rows.length, 0);
  assert.equal(fx.parseCustomsFxXml("").rows.length, 0);
});

test("외화 → 원화, 환율 없으면 null", () => {
  assert.equal(fx.toKrw(12.5, 1385.2), 17315);
  assert.equal(fx.toKrw(10, null), null);
  assert.equal(fx.toKrw(-1, 1000), null);
});

test("한국 시간 날짜(YYYYMMDD) — 자정 직전 UTC는 다음 날", () => {
  assert.equal(fx.kstYmdDaysAgo(0, new Date("2026-10-25T16:00:00Z")), "20261026");
  assert.equal(fx.kstYmdDaysAgo(3, new Date("2026-10-25T16:00:00Z")), "20261023");
});

test("관세는 (원가+운송비)에, 부가세는 (과세가격+관세)에", () => {
  const m = calcMargin({ ...M, sourcePriceKrw: 10000, sellingPriceKrw: 30000, shippingPerUnitKrw: 3000, customsDutyRate: 8, vatRate: 10, domesticFeePerUnitKrw: 500 });
  assert.equal(m.dutiableValueKrw, 13000);
  assert.equal(m.customsDutyKrw, 1040);
  assert.equal(m.importVatKrw, 1404);
  assert.equal(m.landedCostKrw, 15944);
  assert.equal(m.contributionProfitKrw, 7816);
});

test("국내 소싱(세율·운송비 0)은 원가 그대로", () => {
  const m = calcMargin({ ...M, sourcePriceKrw: 10000, sellingPriceKrw: 20000, shippingPerUnitKrw: 0, customsDutyRate: 0, vatRate: 0, domesticFeePerUnitKrw: 0 });
  assert.equal(m.landedCostKrw, 10000);
  assert.equal(m.customsDutyKrw + m.importVatKrw, 0);
});
