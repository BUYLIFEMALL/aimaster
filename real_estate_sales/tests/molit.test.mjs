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
  assert.equal(codes.length, 25 + 47 + 11);
  assert.equal(isSeoulDistrict("11680"), true);
  assert.equal(isSeoulDistrict("41285"), false);
  assert.equal(sidoOf("28237"), "인천");
  assert.equal(findDistrict("41285")?.sgg_nm, "고양시 일산동구");
  assert.equal(findDistrict("99999"), null);
});

test("경기 시 이름 묶기: 구가 여러 개인 시 8곳 + 나머지 한 묶음(맨 뒤)", async () => {
  const { GYEONGGI_DISTRICTS, groupByCity } = await import("../src/lib/publicdata/districts.ts");
  const groups = groupByCity(GYEONGGI_DISTRICTS);
  assert.deepEqual(groups.filter((g) => g.city).map((g) => `${g.city}${g.items.length}`), ["수원시4", "성남시3", "안양시2", "부천시3", "안산시2", "고양시3", "용인시3", "화성시4"]);
  const rest = groups.at(-1);
  assert.equal(rest.city, null);
  assert.equal(rest.items.length, 47 - 24);
  assert.ok(rest.items.some((d) => d.sgg_nm === "김포시"));
});

test("경기·인천 코드가 국토부 전국 법정동 자료와 같음(realty-listing-alert/public/regions.json)", async () => {
  const fs = await import("node:fs");
  const { GYEONGGI_DISTRICTS, INCHEON_DISTRICTS } = await import("../src/lib/publicdata/districts.ts");
  const file = new URL("../../realty-listing-alert/public/regions.json", import.meta.url);
  if (!fs.existsSync(file)) return; // 다른 프로그램 폴더가 없으면 건너뜀
  const r = JSON.parse(fs.readFileSync(file, "utf8"));
  const off = new Set(r.filter((x) => x.c === "41" || x.c === "28").flatMap((x) => x.g.map((g) => g.c)));
  const mine = [...GYEONGGI_DISTRICTS, ...INCHEON_DISTRICTS].map((d) => d.sgg_cd);
  assert.deepEqual(mine.filter((c) => !off.has(c)), []);
  assert.deepEqual([...off].filter((c) => !mine.includes(c)), []);
});

test("실제 응답 모양(2026-10): umdCd·bonbun 없이 동 이름·지번만 → 공식 표로 동 코드, 지번 나누기", async () => {
  const { LEGAL_DONG } = await import("../src/lib/publicdata/legalDong.ts");
  const { splitJibun, legalDongCode } = await import("../src/lib/publicdata/molit.ts");
  const real = { sggCd: "41285", umdNm: "풍동", jibun: "1286", aptNm: "숲속마을2단지", dealYear: "2026", dealMonth: "10", dealDay: "28", dealAmount: "43,000", excluUseAr: "75.82", floor: "7", buildYear: "2006", cdealType: "" };
  const row = molitItemToRow(real, "고양시 일산동구", LEGAL_DONG);
  assert.equal(row.STDG_CD, LEGAL_DONG["41285"]["풍동"]);
  assert.match(row.STDG_CD, /^\d{5}$/);
  assert.equal(row.MNO, "1286");
  assert.equal(row.SNO, "0");
  assert.equal(row.LOTNO_SE, "1");
  assert.deepEqual(splitJibun("25-9"), { mountain: false, bun: "25", ji: "9" });
  assert.deepEqual(splitJibun("산12-1"), { mountain: true, bun: "12", ji: "1" });
  assert.deepEqual(splitJibun(""), { mountain: false, bun: "", ji: "" });
  // 읍·면은 리가 표에 없어 읍 코드로
  assert.equal(legalDongCode(LEGAL_DONG, "41591", "남양읍 남양리"), "25621");
  assert.equal(legalDongCode(LEGAL_DONG, "41591", "남양읍  신남리"), "25622");
  assert.equal(legalDongCode(LEGAL_DONG, "41591", "남양읍 없는리"), LEGAL_DONG["41591"]["남양읍"]);
  assert.equal(legalDongCode(LEGAL_DONG, "99999", "풍동"), "");
});
