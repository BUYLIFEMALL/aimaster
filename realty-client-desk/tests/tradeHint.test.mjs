import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAddressRegion, pickTradeHint } from "../src/lib/desk/tradeHint.ts";

test("주소 해석: 시 아래 구·서울 구·시도 없는 주소", () => {
  assert.deepEqual(parseAddressRegion("경기 고양시 일산동구 백석동 1234"), { sidoPrefixes: ["41"], sggNm: "고양시 일산동구", dong: "백석동" });
  assert.deepEqual(parseAddressRegion("서울특별시 종로구 교남동 28"), { sidoPrefixes: ["11"], sggNm: "종로구", dong: "교남동" });
  assert.deepEqual(parseAddressRegion("종로구 종로1가 1"), { sidoPrefixes: null, sggNm: "종로구", dong: "종로1가" });
  assert.deepEqual(parseAddressRegion("전남 목포시 용해동 5"), { sidoPrefixes: ["46"], sggNm: "목포시", dong: "용해동" });
});

test("주소 해석: 시군구나 동이 없으면 null(결과를 가정하지 않음)", () => {
  assert.equal(parseAddressRegion("백석동 백송마을 5단지"), null, "시군구 없음");
  assert.equal(parseAddressRegion("고양시 일산동구"), null, "동 없음");
  assert.equal(parseAddressRegion(""), null);
  assert.equal(parseAddressRegion("서울 강남"), null);
});

const row = (o) => ({ sgg_cd: "11110", sgg_nm: "종로구", stdg_nm: "교남동", bldg_nm: "경희궁자이", deal_type: "매매", exclusive_area: 84.9, price_amount: 230000, contract_date: "2026-11-01", ...o });

test("최근 신고 순 최대 3줄, 같은 거래 종류만", () => {
  const rows = [row({ contract_date: "2026-10-01" }), row({ contract_date: "2026-11-05", price_amount: 240000 }), row({ contract_date: "2026-09-01" }), row({ contract_date: "2026-08-01" }), row({ deal_type: "전세", contract_date: "2026-11-10" })];
  const h = pickTradeHint(rows, { sidoPrefixes: null, sggNm: "종로구", dong: "교남동" }, "매매");
  assert.equal(h.status, "ok");
  assert.equal(h.lines.length, 3);
  assert.equal(h.lines[0], "2026-11-05 · 경희궁자이 · 전용 84.9㎡ · 24억");
});

test("이름 같은 다른 시군구(서울 중구·부산 중구)가 섞이면 시도로 가리고, 못 가리면 보여 주지 않음", () => {
  const rows = [row({ sgg_cd: "11140", sgg_nm: "중구", stdg_nm: "중앙동" }), row({ sgg_cd: "26110", sgg_nm: "중구", stdg_nm: "중앙동" })];
  assert.deepEqual(pickTradeHint(rows, { sidoPrefixes: null, sggNm: "중구", dong: "중앙동" }, "매매"), { status: "ambiguous" });
  const busan = pickTradeHint(rows, { sidoPrefixes: ["26"], sggNm: "중구", dong: "중앙동" }, "매매");
  assert.equal(busan.status, "ok");
  assert.equal(busan.lines.length, 1);
});

test("자료가 없거나 비어 있으면 none", () => {
  assert.deepEqual(pickTradeHint([], { sidoPrefixes: null, sggNm: "종로구", dong: "교남동" }, "매매"), { status: "none" });
  assert.deepEqual(pickTradeHint([row({ stdg_nm: "평동" })], { sidoPrefixes: null, sggNm: "종로구", dong: "교남동" }, "매매"), { status: "none" });
});

test("월세는 보증금/월세로 표시", () => {
  const h = pickTradeHint([row({ deal_type: "월세", price_amount: 5000, monthly_rent: 150 })], { sidoPrefixes: null, sggNm: "종로구", dong: "교남동" }, "월세");
  assert.match(h.lines[0], /보증금 5,000만\/월 150만$/);
});
