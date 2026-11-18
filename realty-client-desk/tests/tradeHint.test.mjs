import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveAddressRegion as resolve, toTradeHint } from "../src/lib/desk/tradeHint.ts";
import { DISTRICTS } from "../src/lib/desk/districts.ts";
const resolveAddressRegion = (a) => resolve(a, DISTRICTS);

test("주소 → 하나의 시군구 코드: 시 아래 구·서울 구·시도 없는 유일 이름·광주(전남광주 묶음)", () => {
  assert.deepEqual(resolveAddressRegion("경기 고양시 일산동구 백석동 1234"), { sggCd: "41285", sggNm: "고양시 일산동구", dong: "백석동" });
  assert.deepEqual(resolveAddressRegion("서울특별시 종로구 교남동 28"), { sggCd: "11110", sggNm: "종로구", dong: "교남동" });
  assert.deepEqual(resolveAddressRegion("종로구 종로1가 1"), { sggCd: "11110", sggNm: "종로구", dong: "종로1가" }, "종로구는 전국에 하나");
  assert.deepEqual(resolveAddressRegion("광주광역시 광산구 수완동 1"), { sggCd: "12330", sggNm: "광산구", dong: "수완동" }, "광주는 목록에서 전남광주 묶음(코드 12…)");
});

test("동명 시군구: 시도 글자가 있으면 그 하나, 없으면 null(조회하지 않음)", () => {
  assert.equal(resolveAddressRegion("중구 중앙동 1"), null, "중구는 서울·부산·대구·대전·울산에 있음");
  assert.deepEqual(resolveAddressRegion("부산 중구 중앙동 1"), { sggCd: "26110", sggNm: "중구", dong: "중앙동" });
  assert.deepEqual(resolveAddressRegion("서울 중구 신당동 1"), { sggCd: "11140", sggNm: "중구", dong: "신당동" });
  assert.equal(resolveAddressRegion("고성군 간성읍 1"), null, "고성군은 경남·강원에 있음");
  assert.deepEqual(resolveAddressRegion("강원특별자치도 고성군 간성읍 1"), { sggCd: "51820", sggNm: "고성군", dong: "간성읍" });
});

test("시군구·동이 없거나 목록에 없는 이름이면 null", () => {
  assert.equal(resolveAddressRegion("백석동 백송마을 5단지"), null, "시군구 없음");
  assert.equal(resolveAddressRegion("고양시 일산동구"), null, "동 없음");
  assert.equal(resolveAddressRegion("없는시 가상동 1"), null, "목록에 없음");
  assert.equal(resolveAddressRegion(""), null);
});

const region = { sggCd: "11110", sggNm: "종로구", dong: "교남동" };
const row = (o) => ({ sgg_cd: "11110", stdg_nm: "교남동", bldg_nm: "경희궁자이", deal_type: "매매", exclusive_area: 84.9, price_amount: 230000, contract_date: "2026-11-01", ...o });

test("최근 계약일 순 최대 3줄, 조회 조건과 다른 행(다른 코드·동·거래)은 버림", () => {
  const data = [row({ contract_date: "2026-10-01" }), row({ contract_date: "2026-11-05", price_amount: 240000 }), row({ contract_date: "2026-09-01" }), row({ contract_date: "2026-08-01" }),
    row({ sgg_cd: "26110", contract_date: "2026-11-20" }), row({ deal_type: "전세", contract_date: "2026-11-10" })];
  const h = toTradeHint({ data, error: null }, region, "매매");
  assert.equal(h.status, "ok");
  assert.deepEqual(h.lines, ["2026-11-05 · 경희궁자이 · 전용 84.9㎡ · 24억", "2026-10-01 · 경희궁자이 · 전용 84.9㎡ · 23억", "2026-09-01 · 경희궁자이 · 전용 84.9㎡ · 23억"]);
});

test("조회 오류는 error(아무것도 안 보임), 빈 결과는 none(안내)", () => {
  assert.deepEqual(toTradeHint({ data: null, error: { message: "permission denied" } }, region, "매매"), { status: "error" });
  assert.deepEqual(toTradeHint({ data: [row({})], error: { message: "timeout" } }, region, "매매"), { status: "error" }, "오류면 받은 행도 쓰지 않음");
  assert.deepEqual(toTradeHint({ data: [], error: null }, region, "매매"), { status: "none" });
  assert.deepEqual(toTradeHint({ data: null, error: null }, region, "매매"), { status: "none" });
});

test("월세는 보증금/월세로 표시", () => {
  const h = toTradeHint({ data: [row({ deal_type: "월세", price_amount: 5000, monthly_rent: 150 })], error: null }, region, "월세");
  assert.match(h.lines[0], /보증금 5,000만\/월 150만$/);
});

test("2026-11-19 보완: 경기 광주시와 광주광역시를 섞지 않음", () => {
  assert.deepEqual(resolveAddressRegion("경기 광주시 오포읍 1"), { sggCd: "41610", sggNm: "광주시", dong: "오포읍" });
  assert.deepEqual(resolveAddressRegion("경기도 광주시 경안동 1"), { sggCd: "41610", sggNm: "광주시", dong: "경안동" });
  assert.deepEqual(resolveAddressRegion("광주시 경안동 1"), { sggCd: "41610", sggNm: "광주시", dong: "경안동" }, "「광주시」는 시·도가 아니라 경기 광주시");
  assert.deepEqual(resolveAddressRegion("광주광역시 광산구 수완동 1"), { sggCd: "12330", sggNm: "광산구", dong: "수완동" });
  assert.deepEqual(resolveAddressRegion("광주시 광산구 수완동 1"), { sggCd: "12330", sggNm: "광산구", dong: "수완동" }, "붙인 이름이 목록에 없으면 구 이름으로");
  assert.equal(resolveAddressRegion("광주 동구 충장동 1")?.sggCd, "12210", "광주(전남광주 묶음) 동구");
  assert.equal(resolveAddressRegion("동구 충장동 1"), null, "시도 없는 동구는 여러 곳 → 조회 안 함");
  assert.deepEqual(resolveAddressRegion("제주시 노형동 1"), { sggCd: "50110", sggNm: "제주시", dong: "노형동" }, "「제주시」는 시군구");
});

test("2026-11-19 보완: 계약일이 빈 행은 버리고 계약일 있는 최신 순", () => {
  const data = [row({ contract_date: null }), row({ contract_date: null }), row({ contract_date: "2026-10-01" }), row({ contract_date: null })];
  assert.deepEqual(toTradeHint({ data, error: null }, region, "매매"), { status: "ok", lines: ["2026-10-01 · 경희궁자이 · 전용 84.9㎡ · 23억"] });
  assert.deepEqual(toTradeHint({ data: [row({ contract_date: null })], error: null }, region, "매매"), { status: "none" });
});
