// RE-B4: 국토부 실거래 응답 → 서울 줄 모양 변환(2026-10-30)
import { test } from "node:test";
import assert from "node:assert/strict";
import { molitItemToRow, molitItems, molitMonths, molitRows } from "../src/lib/publicdata/molit.ts";
import { ALL_DISTRICTS, findDistrict, isSeoulDistrict, sidoOf } from "../src/lib/publicdata/districts.ts";

const item = {
  sggCd: "41285", umdCd: "10300", umdNm: "백석동", landCd: "1", bonbun: "1234", bubun: "0005",
  aptNm: "백송마을5단지", dealYear: "2026", dealMonth: "10", dealDay: "7", dealAmount: "42,000",
  excluUseAr: "84.97", floor: "12", buildYear: "1994", cdealType: "",
};

test("한 줄 변환: 서울 줄과 같은 칸·단위(만 원·㎡), 앞자리 0 지움", () => {
  assert.deepEqual(molitItemToRow(item, "고양시 일산동구"), {
    RCPT_YR: "2026", CGG_CD: "41285", CGG_NM: "고양시 일산동구", STDG_CD: "10300", STDG_NM: "백석동",
    LOTNO_SE: "1", LOTNO_SE_NM: "대지", MNO: "1234", SNO: "5", BLDG_NM: "백송마을5단지",
    CTRT_DAY: "20261007", THING_AMT: "42000", ARCH_AREA: "84.97", FLR: "12", ARCH_YR: "1994",
  });
});

test("해제 거래·금액 없는 줄은 버림, 산 지번은 2", () => {
  assert.equal(molitItemToRow({ ...item, cdealType: "O" }, "x"), null);
  assert.equal(molitItemToRow({ ...item, dealAmount: "" }, "x"), null);
  assert.equal(molitItemToRow({ ...item, landCd: "2" }, "x").LOTNO_SE, "2");
  assert.equal(molitItemToRow({ ...item, bubun: "0000" }, "x").SNO, "0");
});

test("응답 모양: 여러 줄·한 줄 객체·빈 결과", () => {
  const wrap = (it) => ({ response: { header: { resultCode: "000" }, body: { items: it === undefined ? "" : { item: it } } } });
  assert.equal(molitItems(wrap([item, item])).length, 2);
  assert.equal(molitItems(wrap(item)).length, 1);
  assert.equal(molitItems(wrap(undefined)).length, 0);
  assert.equal(molitItems(null).length, 0);
  const rows = molitRows([wrap([{ ...item, dealDay: "1" }]), wrap(item)], "고양시 일산동구");
  assert.deepEqual(rows.map((r) => r.CTRT_DAY), ["20261007", "20261001"]); // 최신순
});

test("조회 달: 이번 달·지난달(한국 시간, 해 넘김)", () => {
  assert.deepEqual(molitMonths(new Date("2026-10-30T03:00:00Z")), ["202610", "202609"]);
  assert.deepEqual(molitMonths(new Date("2026-12-31T16:00:00Z")), ["202701", "202612"]); // 한국 1월 1일 새벽
});

test("지역 목록: 코드 겹침 없음, 서울/경기/인천 구분", () => {
  const codes = ALL_DISTRICTS.map((d) => d.sgg_cd);
  assert.equal(new Set(codes).size, codes.length);
  assert.ok(codes.every((c) => /^\d{5}$/.test(c)));
  assert.equal(codes.length, 25 + 44 + 10);
  assert.equal(isSeoulDistrict("11680"), true);
  assert.equal(isSeoulDistrict("41285"), false);
  assert.equal(sidoOf("28237"), "인천");
  assert.equal(findDistrict("41285")?.sgg_nm, "고양시 일산동구");
  assert.equal(findDistrict("99999"), null);
});
