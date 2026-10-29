// 출고지·반품지 응답 정리(문서 응답 모양 기준, 외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeOutbound, normalizeReturnCenters, returnCentersPath } from "../src/lib/coupang/logistics.ts";

test("출고지: 도로명 주소 우선, 코드 없는 줄 제외", () => {
  const r = normalizeOutbound({
    content: [
      { outboundShippingPlaceCode: 123, shippingPlaceName: "본사", usable: true, placeAddresses: [
        { addressType: "JIBUN", returnAddress: "지번 주소", returnAddressDetail: "1층" },
        { addressType: "ROADNAME", returnAddress: "도로명 주소", returnAddressDetail: "2층" },
      ] },
      { shippingPlaceName: "코드 없음" },
    ],
    pagination: { totalPages: 3 },
  });
  assert.deepEqual(r.places, [{ code: "123", name: "본사", usable: true, address: "도로명 주소 2층", remote: [] }]);
  assert.equal(r.totalPages, 3);
});

test("반품지: data.content 안, 연락처·우편번호·택배사", () => {
  const r = normalizeReturnCenters({
    code: 200,
    data: {
      content: [{ returnCenterCode: "1000123", shippingPlaceName: "반품지1", usable: false, deliverCode: "CJGLS", deliverName: "CJ대한통운",
        placeAddresses: [{ addressType: "ROADNAME", companyContactNumber: "02-1234-5678", returnZipCode: "12345", returnAddress: "서울", returnAddressDetail: "3층" }] }],
      pagination: { totalPages: 1 },
    },
  });
  assert.deepEqual(r.centers[0], { code: "1000123", name: "반품지1", usable: false, phone: "02-1234-5678", zipCode: "12345", address: "서울", addressDetail: "3층", courierCode: "CJGLS", courierName: "CJ대한통운" });
});

test("빈 응답도 오류 없이 빈 목록", () => {
  assert.deepEqual(normalizeOutbound(null).places, []);
  assert.deepEqual(normalizeReturnCenters({}).centers, []);
});

test("반품지 경로에 업체코드가 들어간다", () => {
  assert.equal(returnCentersPath("A00012345"), "/v2/providers/openapi/apis/api/v5/vendors/A00012345/returnShippingCenters");
});
