// 실행: node --test tests/   — M2-2 주문 엑셀·송장 일괄 등록·선택 일괄 변경 규칙(2026-11-15)
import { test } from "node:test";
import assert from "node:assert/strict";
import { EXPORT_HEADERS, TRACKING_MAX_ROWS, cleanIds, isBulkTarget, kstStamp, orderExportRow, parseTrackingSheet, trackingSteps } from "../src/lib/order-excel.ts";

const LABEL = { paid: "결제 완료", shipping: "배송 중" };
const base = {
  order_no: "20261115-0001", created_at: "2026-11-15T05:05:00Z", status: "paid",
  receiver: { receiver: "홍길동", phone: "010-1111-2222", zip: "06236", addr1: "서울 강남구", addr2: "101호" },
  depositor: "홍길동", memo: "문 앞", subtotal: 10000, shipping_fee: 3000, total: 13000,
  is_card: false, is_credit: false, is_guest: false, guest_name: null, courier: "", tracking_no: "",
  items: [
    { name_snapshot: "볼펜", option_snapshot: "검정", qty: 10, cancelled_qty: 2 },
    { name_snapshot: "노트", option_snapshot: "", qty: 1, cancelled_qty: 1 },
  ],
};

test("엑셀 한 줄: 칸 수가 머리글과 같고, 취소한 수량은 빼고, 한국 시간", () => {
  const row = orderExportRow(base, LABEL);
  assert.equal(row.length, EXPORT_HEADERS.length);
  assert.equal(row[1], "2026-11-15 14:05");
  assert.equal(row[2], "결제 완료");
  assert.equal(row[9], "볼펜 (검정) × 8"); // 노트는 다 취소돼 빠짐
  assert.equal(row[10], "8");
  assert.equal(row[14], "무통장 입금");
  assert.deepEqual(row.slice(-2), ["", ""]);
});

test("엑셀 한 줄: 카드·비회원·품목별 송장", () => {
  const row = orderExportRow({ ...base, is_card: true, is_guest: true, guest_name: "손님", courier: "CJ", tracking_no: "품목별 송장" }, LABEL);
  assert.equal(row[14], "카드");
  assert.equal(row[3], "손님(비회원)");
  assert.deepEqual(row.slice(-2), ["", ""]); // 품목별 송장은 주문 상세에서
  const r2 = orderExportRow({ ...base, courier: "CJ대한통운", tracking_no: "123" }, LABEL);
  assert.deepEqual(r2.slice(-2), ["CJ대한통운", "123"]);
  assert.equal(kstStamp("2026-12-31T15:30:00Z"), "2027-01-01 00:30");
});

test("송장 시트: 머리글 위치와 상관없이 찾고, 안 채운 줄은 건너뜀", () => {
  const t = [
    ["메모", "송장 번호", "주문번호", "택배사"],
    ["", "1234 5678", "A-1", "CJ"],
    ["", "", "A-2", ""],
    ["", "999", "A-3", ""],
    ["", "777", "A-1", "한진"],
    ["", "x".repeat(41), "A-4", "롯데"],
  ];
  const s = parseTrackingSheet(t);
  assert.ok(!("error" in s));
  assert.deepEqual(s.lines, [{ row: 2, orderNo: "A-1", courier: "CJ", tracking: "12345678" }]);
  assert.deepEqual(s.errors.map((e) => e.row), [4, 5, 6]);
  assert.match(s.errors[1].message, /2번째 줄과 같은 주문/);
});

test("송장 시트: 칸이 없으면 안내, 너무 많으면 나눠 올리라고", () => {
  assert.ok("error" in parseTrackingSheet([["주문번호", "택배사"]]));
  const many = [["주문번호", "택배사", "송장번호"], ...Array.from({ length: TRACKING_MAX_ROWS + 1 }, (_, i) => [`N-${i}`, "CJ", `${i}`])];
  assert.match(parseTrackingSheet(many).error, /500건까지/);
});

test("송장 넣을 때 상태 이동: 결제 완료는 배송 준비를 거침, 그 밖은 건너뜀", () => {
  assert.deepEqual(trackingSteps("paid"), { steps: ["preparing", "shipping"] });
  assert.deepEqual(trackingSteps("preparing"), { steps: ["shipping"] });
  assert.ok("skip" in trackingSteps("shipping"));
  assert.ok("skip" in trackingSteps("pending_payment"));
  assert.ok("skip" in trackingSteps("cancelled"));
});

test("선택 일괄: 앞으로 가는 세 상태만, id는 uuid만·중복 제거·100건", () => {
  assert.deepEqual(["paid", "preparing", "delivered", "cancelled", "shipping", "toString"].map(isBulkTarget), [true, true, true, false, false, false]);
  const id = "00000000-0000-0000-0000-0000000000a1";
  assert.deepEqual(cleanIds([id, id, "x; drop", ""]), [id]);
  const many = Array.from({ length: 150 }, (_, i) => `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`);
  assert.equal(cleanIds(many).length, 100);
});
