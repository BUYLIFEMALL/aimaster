import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSpecs, prefillBasics, guessNotiType, prefillNoti } from "../src/lib/elevenst/prefill.ts";
import { notiType, NOTI_DEFAULT_VALUE } from "../src/lib/elevenst/notification.ts";
import { buildProductXml, checkDraft } from "../src/lib/elevenst/product.ts";
import { pickTag } from "../src/lib/elevenst/xml.ts";

// 운영 상세페이지 상품 specs 실제 모양(2026-11-11, 줄바꿈 \r\n)
const SPECS = "품명: 스위스톤 확장형 여행백팩\r\n품번: ST4D18\r\n소재: 폴리에스테르\r\n색상: 블랙\r\n사이즈: 46 x 32 x 15 (+10) cm\r\n용량: 23L ~ 39L\r\n중량: 0.9kg\r\n제조국: 중국\r\n브랜드: 스위스톤";

test("parseSpecs·prefillBasics: 「이름: 값」 줄과 브랜드·원산지", () => {
  const m = parseSpecs(SPECS);
  assert.equal(m.get("품번"), "ST4D18");
  assert.equal(m.get("사이즈"), "46 x 32 x 15 (+10) cm");
  assert.deepEqual(prefillBasics(m), { brand: "스위스톤", origin: "중국" });
  assert.deepEqual(prefillBasics(parseSpecs("")), { brand: "", origin: "" });
});

test("guessNotiType: 11번가 경로 먼저, 없으면 상세페이지 카테고리, 못 찾으면 기타 재화", () => {
  const name = (c) => notiType(c).name;
  assert.equal(name(guessNotiType("남성가방 › 백팩 › 백팩")), "가방");
  assert.equal(name(guessNotiType("주방용품 › 보온/보냉용품 › 보온컵/텀블러")), "주방용품");
  assert.equal(name(guessNotiType("골프 › 골프의류 › 티셔츠")), "의류");
  assert.equal(name(guessNotiType("", "패션의류 > 여성의류 > 원피스")), "의류");
  assert.equal(name(guessNotiType("음향가전 › 이어폰 › 무선 이어폰")), "기타 재화");
});

test("prefillNoti: 가방 고시 항목을 specs로 채우고 나머지는 기본값", () => {
  const t = notiType(guessNotiType("남성가방 › 백팩 › 백팩"));
  const { values, filled } = prefillNoti(t, parseSpecs(SPECS), "백팩");
  assert.equal(values["11835"], "블랙"); // 색상
  assert.equal(values["11848"], "폴리에스테르"); // 소재
  assert.equal(values["11908"], "백팩"); // 종류 ← 카테고리
  assert.equal(values["23759095"], "중국"); // 제조국
  assert.equal(values["11932"], "46 x 32 x 15 (+10) cm / 23L ~ 39L"); // 크기,용량,형태
  assert.equal(values["11905"], NOTI_DEFAULT_VALUE); // 제조자/수입자 없음
  assert.equal(filled, 5);
  const etc = prefillNoti(notiType("891045"), parseSpecs(SPECS));
  assert.equal(etc.values["11800"], "스위스톤 확장형 여행백팩 / ST4D18"); // 품명 및 모델명
  assert.ok([...prefillNoti(t, parseSpecs(`색상: ${"가".repeat(80)}`)).values["11835"]].length <= 50);
});

test("즉시할인: 켜면 정가+할인 칸, 끄면 칸 없음, 판매가 이상 할인은 오류", () => {
  const base = {
    name: "백팩", brand: "", categoryNo: "1", price: 99000, discount: 43000, stock: 9, tax: "01", minorOk: true, originText: "중국", kc: "none", option: null,
    delivery: { feeType: "01", fee: 0, freeOver: 0, jeju: 3000, island: 5000, returnFee: 3000, exchangeFee: 6000, outSeq: "2", inSeq: "3", sendCloseNo: "", bundle: true },
    asDetail: "문의", returnDetail: "7일", noti: { type: "891045", values: {} },
  };
  const img = { main: "https://x/a.jpg", extras: [], details: [] };
  const xml = buildProductXml(base, img);
  assert.equal(pickTag(xml, "selPrc"), "99000");
  assert.equal(pickTag(xml, "cuponcheck"), "Y");
  assert.equal(pickTag(xml, "dscAmtPercnt"), "43000");
  assert.equal(pickTag(xml, "cupnDscMthdCd"), "01");
  assert.ok(!buildProductXml({ ...base, discount: 0 }, img).includes("cuponcheck"));
  assert.match(checkDraft({ ...base, discount: 99000 }, { categoryIsLeaf: true, hasMainImage: true }).errors.join(), /판매가보다 작아야/);
});
