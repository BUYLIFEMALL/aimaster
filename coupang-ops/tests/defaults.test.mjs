// 배송·반품 기본값 정리·검사(외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkDefaults, normalizeDefaults } from "../src/lib/coupang/defaults.ts";

test("화면 폼 값(글자·체크)을 정리한다", () => {
  const d = normalizeDefaults({
    outboundShippingPlaceCode: " 123 ",
    outboundShippingPlaceName: "바이라이프",
    returnCenterCode: "R1",
    returnCenterName: "반품지",
    returnPhone: "02-1234-5678",
    deliveryMethod: "SEQUENCIAL",
    deliveryCompanyCode: "cjgls",
    deliveryChargeType: "CONDITIONAL_FREE",
    deliveryCharge: "3,000원",
    freeShipOverAmount: "30000",
    deliveryChargeOnReturn: "3000",
    returnCharge: "3000",
    remoteAreaDeliverable: "on",
    outboundShippingTimeDay: "2",
  });
  assert.equal(d.outboundShippingPlaceCode, "123");
  assert.equal(d.outboundShippingPlaceName, "바이라이프"); // 새로고침 뒤 표시용 이름도 저장
  assert.equal(d.returnCenter.code, "R1");
  assert.equal(d.deliveryCompanyCode, "CJGLS");
  assert.equal(d.deliveryCharge, 3000);
  assert.equal(d.remoteAreaDeliverable, true);
  assert.equal(d.unionDelivery, true); // 값이 없으면 묶음배송 가능
  assert.deepEqual(checkDefaults(d), []);
});

test("DB에 저장된 모양(returnCenter 묶음)도 그대로 읽는다", () => {
  const saved = normalizeDefaults({ outboundShippingPlaceCode: "1", returnCenter: { code: "R9", name: "창고", phone: "010", zipCode: "1", address: "a", addressDetail: "b" }, unionDelivery: false });
  assert.equal(saved.returnCenter.code, "R9");
  assert.equal(saved.unionDelivery, false);
  assert.deepEqual(normalizeDefaults(saved), saved); // 다시 정리해도 같음
});

test("모르는 코드값은 안전한 기본값", () => {
  const d = normalizeDefaults({ deliveryMethod: "X", deliveryChargeType: "Y", outboundShippingTimeDay: "99" });
  assert.equal(d.deliveryMethod, "SEQUENCIAL");
  assert.equal(d.deliveryChargeType, "FREE");
  assert.equal(d.outboundShippingTimeDay, 30);
});

test("빠진 값·규칙 위반을 알려 준다", () => {
  const p = checkDefaults(normalizeDefaults({ deliveryChargeType: "CONDITIONAL_FREE", deliveryChargeOnReturn: 3000, returnCharge: 6000 }));
  assert.ok(p.some((s) => s.includes("출고지")));
  assert.ok(p.some((s) => s.includes("반품지")));
  assert.ok(p.some((s) => s.includes("택배사")));
  assert.ok(p.some((s) => s.includes("무료배송 기준")));
  assert.ok(p.some((s) => s.includes("100~150%")));
});
