// v1.10 계산기 분리 회귀 테스트 — 검색결과 마진표·프로모션 필터·CSV(외부 API·DB 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

// lib/sourcingResults.ts는 확장자 없는 상대 import(./margin)를 써서 Node가 바로 못 읽는다 → esbuild로 묶어서 불러온다
async function load(entry) {
  const out = await build({ entryPoints: [entry], bundle: true, write: false, format: "esm", platform: "node" });
  return import("data:text/javascript;base64," + Buffer.from(out.outputFiles[0].text).toString("base64"));
}
const { buildResultMarginRows, promoMatchKeys, resultRowsToCsv, defaultsFor, isDomesticPlatform, EMPTY_RESULTS } = await load("lib/sourcingResults.ts");
const margin = await load("lib/margin.ts");
const { calcMargin, MARGIN_DEFAULTS: M, DOMESTIC_MARGIN_DEFAULTS: D } = margin;

const prod = (platform, key, title, priceKrw) => ({ key, platform, title, imageUrl: "", priceKrw, metaText: "", detailUrl: `https://x/${key}` });

test("검색결과 전체 마진: 원가×2.5 판매가, 채널별 기본값, 가격 없는 상품 제외, 마진율 높은 순", () => {
  const rows = buildResultMarginRows({
    ...EMPTY_RESULTS,
    aliexpress: { products: [prod("aliexpress", "a1", "해외 상품", 10000), prod("aliexpress", "a2", "가격없음", null)] },
    domeggook: { products: [prod("domeggook", "d1", "국내 상품 공동구매", 10000)] },
  });
  assert.equal(rows.length, 2);
  const ali = rows.find(r => r.key === "a1"), dome = rows.find(r => r.key === "d1");
  assert.equal(ali.sellingPriceKrw, 25000);
  const expectAli = calcMargin({ sourcePriceKrw: 10000, customsDutyRate: M.customsDutyRate, vatRate: M.vatRate, shippingPerUnitKrw: M.shippingPerUnitKrw, domesticFeePerUnitKrw: M.domesticFeePerUnitKrw, platformFeeRate: M.platformFeeRate, deliveryFeeKrw: M.deliveryFeeKrw, marketingFeeKrw: M.marketingFeeKrw, sellingPriceKrw: 25000 });
  assert.equal(ali.marginRatePct, expectAli.marginRatePct);
  assert.ok(dome.marginRatePct > ali.marginRatePct, "국내는 관세·운송비가 없어 마진율이 더 높음");
  assert.equal(rows[0].key, "d1");
  assert.equal(dome.isPromo, true); assert.equal(ali.isPromo, false);
});

test("프로모션 필터: 문구 + 마진율 하한 동시 만족만", () => {
  const rows = buildResultMarginRows({ ...EMPTY_RESULTS, domeggook: { products: [prod("domeggook", "d1", "특가 이벤트", 10000), prod("domeggook", "d2", "일반", 10000)] } });
  assert.deepEqual([...promoMatchKeys(rows, "0")], ["domeggook:d1"]);
  assert.equal(promoMatchKeys(rows, "999").size, 0);
  assert.equal(promoMatchKeys(rows, "abc").size, 1, "숫자가 아니면 0%로");
});

test("CSV: BOM·머리글·따옴표 이스케이프·채널 이름", () => {
  const rows = buildResultMarginRows({ ...EMPTY_RESULTS, elevenst: { products: [prod("elevenst", "e1", '따옴표 "포함"', 1000)] } });
  const csv = resultRowsToCsv(rows, "무선청소기");
  assert.ok(csv.startsWith("﻿\"키워드\""));
  const lines = csv.slice(1).split("\r\n");
  assert.equal(lines.length, 2);
  assert.match(lines[1], /^"무선청소기","🏪 11번가 \(국내\)","따옴표 ""포함""","1000","2500",/);
});

test("채널 기본값: 국내 2곳은 국내 기본값", () => {
  assert.equal(isDomesticPlatform("domeggook"), true); assert.equal(isDomesticPlatform("elevenst"), true);
  assert.equal(isDomesticPlatform("aliexpress"), false); assert.equal(isDomesticPlatform(null), false);
  assert.deepEqual(defaultsFor("elevenst"), D); assert.deepEqual(defaultsFor(null), M);
});
