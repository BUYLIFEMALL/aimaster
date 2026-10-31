// 출고지·반품지·회수 송장·철회 이력(외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPlace, checkRemote, checkReturnContract, normalizeCouponItems, normalizeWithdrawals, outboundCreateBody, outboundUpdateBody, pickupBody, placeResult, returnCreateBody, returnUpdateBody, withdrawalsQuery } from "../src/lib/coupang/logisticsWrite.ts";
import { autoOptionPath } from "../src/lib/coupang/productEdit.ts";

const place = { name: "본사", phone: "02-1234-5678", zip: "05510", address: "서울", addressDetail: "1층" };
const contract = { courier: "CJGLS", contractNumber: "855", contractCustomerNumber: "", fee: 2500 };

test("주소 검사", () => {
  assert.equal(checkPlace(place), "");
  assert.match(checkPlace({ ...place, phone: "0212345678" }), /전화번호/);
  assert.match(checkPlace({ ...place, zip: "12" }), /우편번호/);
  assert.match(checkPlace({ ...place, name: "" }), /이름/);
});

test("도서산간 배송비 규칙", () => {
  assert.equal(checkRemote({ courier: "CJGLS", jeju: 3000, notJeju: 0 }), "");
  assert.match(checkRemote({ courier: "CJGLS", jeju: 500, notJeju: 0 }), /1,000/);
  assert.match(checkRemote({ courier: "CJGLS", jeju: 1050, notJeju: 0 }), /100원 단위/);
  assert.equal(checkRemote({ courier: "EPOST", jeju: 300, notJeju: 0 }), "");
  assert.match(checkRemote({ courier: "EPOST", jeju: 1000, notJeju: 0 }), /400/);
});

test("명세 형식 본문", () => {
  const out = outboundCreateBody("A1", "w", place, { courier: "CJGLS", jeju: 3000, notJeju: 0 });
  assert.equal(out.placeAddresses[0].addressType, "JIBUN");
  assert.equal(out.remoteInfos[0].jeju, "3000");
  const up = outboundUpdateBody("A1", "w", "123", place);
  assert.equal(up.outboundShippingPlaceCode, 123);
  assert.equal(up.remoteInfos, undefined);
  const ret = returnCreateBody("A1", "w", place, contract);
  assert.equal(ret.goodsflowInfoOpenApiDto.returnFee20kg, "2500");
  assert.equal(ret.goodsflowInfoOpenApiDto.vendorCreditFee05kg, "2500");
  assert.equal(returnUpdateBody("A1", "w", "9", place, contract).returnCenterCode, "9");
  assert.deepEqual(pickupBody("RETURN", 5, "CJGLS", "123", ""), { returnExchangeDeliveryType: "RETURN", receiptId: 5, deliveryCompanyCode: "CJGLS", invoiceNumber: "123" });
  assert.equal(pickupBody("EXCHANGE", 5, "CJGLS", "123", "77").regNumber, "77");
  assert.match(autoOptionPath(true, 5), /vendor-items\/5\/auto-generated\/opt-in$/);
  assert.match(autoOptionPath(false), /seller\/auto-generated\/opt-out$/);
});

test("반품지 계약 검사", () => {
  assert.equal(checkReturnContract(contract, true), "");
  assert.match(checkReturnContract({ ...contract, contractNumber: "" }, true), /계약코드/);
  assert.equal(checkReturnContract({ ...contract, contractNumber: "" }, false), "");
  assert.match(checkReturnContract({ ...contract, courier: "KDEXP" }, true), /택배사/);
  assert.match(checkReturnContract({ ...contract, fee: 0 }, true), /요금/);
});

test("응답 정리", () => {
  assert.deepEqual(placeResult({ data: { resultCode: "SUCCESS", resultMessage: "115" } }), { ok: true, message: "115" });
  assert.equal(placeResult(null).ok, false);
  assert.match(withdrawalsQuery(Date.parse("2026-10-31T00:00:00Z")), /dateFrom=2026-10-25&dateTo=2026-10-31/);
  const w = normalizeWithdrawals({ data: [{ cancelId: 1, orderId: 2, refundDeliveryDuty: "COM", createdAt: "t", vendorItemIds: [3] }] });
  assert.equal(w[0].dutyLabel, "판매자");
  assert.deepEqual(normalizeWithdrawals(null), []);
  assert.deepEqual(normalizeCouponItems({ data: { content: [{ vendorItemId: 7 }], pagination: { totalElements: 9 } } }), { vendorItemIds: [7], total: 9 });
});

test("고정 IP 주소 검사와 가림", async () => {
  const { maskProxyUrl, validateProxyUrl } = await import("../src/lib/coupang/keys.ts");
  const good = "http://fixie:abc123@my-group.usefixie.com:80";
  assert.equal(validateProxyUrl(good).url, good);
  assert.equal(maskProxyUrl(good), "http://••••@my-group.usefixie.com");
  assert.doesNotMatch(maskProxyUrl(good), /abc123/);
  for (const bad of ["", "fixie", "ftp://a.com", "http://localhost:80", "http://127.0.0.1:80", "http://192.168.0.1", "http://10.0.0.1", "http://[::1]:80"]) assert.ok(validateProxyUrl(bad).error, bad);
});
