import { test } from "node:test";
import assert from "node:assert/strict";
import { checkDraft, buildProductXml, certGroups, detailHtml, NO_BRAND } from "../src/lib/elevenst/product.ts";
import { NOTI_TYPES, DEFAULT_NOTI_TYPE, notiType } from "../src/lib/elevenst/notification.ts";
import { pickTag } from "../src/lib/elevenst/xml.ts";

const ok = { categoryIsLeaf: true, hasMainImage: true };
function draft(patch = {}) {
  const t = notiType(DEFAULT_NOTI_TYPE);
  return {
    name: "스테인리스 텀블러 500ml",
    brand: "바이라이프",
    categoryNo: "1009391",
    price: 19900,
    stock: 99,
    tax: "01",
    minorOk: true,
    originText: "상세설명 참조",
    kc: "none",
    option: null,
    delivery: { feeType: "01", fee: 3000, freeOver: 30000, jeju: 3000, island: 5000, returnFee: 3000, exchangeFee: 6000, outSeq: "2", inSeq: "3", sendCloseNo: "344836", bundle: true },
    asDetail: "판매자에게 문의해 주세요.",
    returnDetail: "7일 이내 반품 가능",
    noti: { type: t.type, values: Object.fromEntries(t.items.map(([c]) => [c, "상품상세설명 참조"])) },
    ...patch,
  };
}
const IMG = { main: "https://x.test/i/a.jpg", extras: ["https://x.test/i/b.jpg"], details: ["https://x.test/i/c.jpg", "https://x.test/i/d.jpg"] };

test("고시 코드표: 40개 유형, 기본은 기타 재화", () => {
  assert.equal(NOTI_TYPES.length, 40);
  assert.equal(notiType(DEFAULT_NOTI_TYPE).name, "기타 재화");
  assert.equal(notiType(DEFAULT_NOTI_TYPE).items.length, 5);
});

test("checkDraft: 바른 초안은 오류 없음", () => {
  assert.deepEqual(checkDraft(draft(), ok), { errors: [], warnings: [] });
});

test("checkDraft: 10원 단위·재고·카테고리·대표 이미지·이모지를 잡음", () => {
  const r = checkDraft(draft({ price: 19995, stock: 0, name: "텀블러🔥", categoryNo: "" }), { categoryIsLeaf: null, hasMainImage: false });
  const all = r.errors.join("\n");
  assert.match(all, /10원 단위/);
  assert.match(all, /재고는 1개 이상/);
  assert.match(all, /카테고리를 골라/);
  assert.match(all, /대표 이미지가 없습니다/);
  assert.match(all, /받을 수 없는 글자.*🔥/);
  assert.match(checkDraft(draft(), { categoryIsLeaf: false, hasMainImage: true }).errors.join(), /맨 아래 카테고리만/);
});

test("checkDraft: 옵션 규칙(금지 글자·중복·0원 옵션·가격 범위)", () => {
  const bad = checkDraft(draft({ option: { title: "색상", rows: [{ value: "블랙#1", addPrice: 1000, qty: 5 }, { value: "블랙#1", addPrice: 50000, qty: 0 }] } }), ok).errors.join("\n");
  assert.match(bad, /쓸 수 없습니다/);
  assert.match(bad, /두 번 있습니다/);
  assert.match(bad, /0원인 옵션/);
  assert.match(bad, /-50%~\+100%/);
  assert.match(bad, /재고를 1 이상/);
  const good = draft({ stock: 0, option: { title: "색상", rows: [{ value: "블랙", addPrice: 0, qty: 5 }, { value: "화이트", addPrice: 1000, qty: 3 }] } });
  assert.deepEqual(checkDraft(good, ok).errors, []);
});

test("checkDraft: 빈 고시 항목·빈 안내·브랜드 없음 경고", () => {
  const d = draft({ brand: "", asDetail: " " });
  d.noti.values["11800"] = "";
  const r = checkDraft(d, ok);
  assert.match(r.errors.join(), /품명 및 모델명/);
  assert.match(r.errors.join(), /A\/S 안내/);
  assert.match(r.warnings.join(), new RegExp(NO_BRAND));
});

test("buildProductXml: 필수 칸·배송·고시·이미지가 들어감", () => {
  const xml = buildProductXml(draft({ brand: "" }), IMG);
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="EUC-KR"?><Product>'));
  const expect = [
    ["selMthdCd", "01"],
    ["dispCtgrNo", "1009391"],
    ["prdTypCd", "01"],
    ["prdNm", "스테인리스 텀블러 500ml"],
    ["brand", NO_BRAND],
    ["selPrc", "19900"],
    ["prdSelQty", "99"],
    ["addrSeqOut", "2"],
    ["addrSeqIn", "3"],
    ["dlvSendCloseTmpltNo", "344836"],
    ["dlvCstInstBasiCd", "01"],
    ["prdImage01", IMG.main],
    ["prdImage02", IMG.extras[0]],
    ["selTermUseYn", "N"],
    ["dlvClf", "02"],
  ];
  for (const [tag, v] of expect) assert.equal(pickTag(xml, tag), v, tag);
  assert.ok(!xml.includes("<prdImage03>"), "없는 추가 이미지 칸은 빠짐");
  assert.ok(!xml.includes("<dlvCst1>"), "무료배송이면 배송비 칸 없음");
  assert.ok(!xml.includes("<optSelectYn>"), "옵션 없으면 옵션 칸 없음");
  assert.equal((xml.match(/<item>/g) ?? []).length, 5);
  assert.match(xml, /<ProductNotification><type>891045<\/type><item><code>11800<\/code><name><!\[CDATA\[상품상세설명 참조\]\]><\/name><\/item>/);
  assert.equal((xml.match(/<ProductCertGroup>/g) ?? []).length, 4);
  assert.match(xml, /<htmlDetail><!\[CDATA\[<div[\s\S]*c\.jpg[\s\S]*d\.jpg[\s\S]*<\/div>\]\]><\/htmlDetail>/);
});

test("buildProductXml: 옵션·조건부 무료 배송", () => {
  const base = draft();
  const xml = buildProductXml(
    draft({
      option: { title: "색상", rows: [{ value: "블랙", addPrice: 0, qty: 5 }, { value: " ", addPrice: 0, qty: 1 }, { value: "화이트", addPrice: 1000, qty: 3 }] },
      delivery: { ...base.delivery, feeType: "03", fee: 3000, freeOver: 30000, sendCloseNo: "" },
    }),
    IMG,
  );
  assert.ok(!xml.includes("<prdSelQty>"), "옵션이 있으면 재고는 옵션 합계");
  assert.equal(pickTag(xml, "txtColCnt"), "1");
  assert.equal((xml.match(/<ProductOption>/g) ?? []).length, 2, "빈 옵션 줄은 빠짐");
  assert.match(xml, /<ProductOption><useYn>Y<\/useYn><colOptPrice>1000<\/colOptPrice><colValue0><!\[CDATA\[화이트\]\]><\/colValue0><colCount>3<\/colCount><\/ProductOption>/);
  assert.equal(pickTag(xml, "dlvCst1"), "3000");
  assert.equal(pickTag(xml, "PrdFrDlvBasiAmt"), "30000");
  assert.ok(!xml.includes("<dlvSendCloseTmpltNo>"));
});

test("certGroups·detailHtml", () => {
  assert.deepEqual(certGroups("exempt-buy")[0], { crtfGrpTypCd: "01", crtfGrpObjClfCd: "02", crtfGrpExptTypCd: "02" });
  assert.deepEqual(certGroups("none")[3], { crtfGrpTypCd: "04", crtfGrpObjClfCd: "05" });
  assert.ok(!detailHtml(['https://x/"a.jpg']).includes('"a.jpg'));
});
