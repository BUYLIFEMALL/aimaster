import { test } from "node:test";
import assert from "node:assert/strict";
import { missingAdItems, riskyPhrases } from "../src/lib/desk/adCheck.ts";

const full = { address: "고양시 일산동구 백석동 1234", area_m2: 84.9, price: 40000, property_type: "아파트", deal_type: "전세", floor_info: "12층/25층", approval_date: "2004-06", direction: "남향", rooms: 3, baths: 2, move_in: "즉시", parking: "1.2대", mgmt_fee: "월 25만" };
const office = { office_name: "백석공인", office_phone: "031-1", office_address: "백석동", reg_no: "41285-2020-00001", broker_name: "홍길동" };

test("다 채운 아파트 매물은 빠진 것 없음", () => {
  assert.deepEqual(missingAdItems(full, office), { office: [], listing: [] });
});

test("빠진 항목 알려 주기 — 사무소 등록번호·성명, 총 층수·방향·방욕실", () => {
  const r = missingAdItems({ ...full, floor_info: "12층", direction: null, baths: null }, { ...office, reg_no: "", broker_name: null });
  assert.deepEqual(r.office, ["중개사무소 등록번호", "개업공인중개사 성명"]);
  assert.deepEqual(r.listing, ["층(해당 층/총 층수)", "방향", "방·욕실 수"]);
});

test("토지는 건축물 항목을 묻지 않음, 사무소 정보 없으면 5개 모두", () => {
  const r = missingAdItems({ ...full, property_type: "토지", floor_info: null, approval_date: null, direction: null, rooms: null, baths: null, move_in: null, parking: null, mgmt_fee: null }, null);
  assert.equal(r.office.length, 5);
  assert.deepEqual(r.listing, []);
});

test("주의 표현 찾기", () => {
  assert.deepEqual(riskyPhrases("역세권 최저가 매물, 수익 보장"), ["최저가", "수익 보장"]);
  assert.deepEqual(riskyPhrases("남향 84㎡ 전세"), []);
});
