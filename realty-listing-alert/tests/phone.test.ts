// 중개사 번호(2026-10-25 주인님 결정: 사무실 + 휴대폰, 없으면 빈칸) — node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractPhones, phoneText } from "../extension/lib/listing.js";
import { COLUMNS, toCsv, toTable, toXlsx } from "../extension/lib/sheet.js";
import { buildSummary } from "../extension/lib/telegram.js";

const item = { no: "9", complexNo: "107014", complexName: "일산요진", dong: "106동", tradeName: "매매", priceText: "9억 2,000", area: 84, areaName: "118A", floor: "저/57", direction: "", feature: "", confirmYmd: "20261025", realtor: "요진부동산" };

test("상세 응답에서 사무실·휴대폰 번호를 찾는다(안쪽 객체까지)", () => {
  const body = { articleDetail: { articleNo: "9" }, articleRealtor: { realtorName: "요진부동산", representativeTelNo: "031-917-1234", cellPhoneNo: "010-1234-5678" } };
  assert.deepEqual(extractPhones(body, {}), { office: "031-917-1234", mobile: "010-1234-5678" });
  assert.deepEqual(extractPhones({ articleRealtor: { realtorPhone: "02-555-0000" } }, {}), { office: "02-555-0000", mobile: "" });
  assert.deepEqual(extractPhones({ x: { cellPhoneNo: "" } }, {}), { office: "", mobile: "" });
  assert.deepEqual(extractPhones(null, {}), { office: "", mobile: "" });
});

test("요약 번호 글자: 있는 것만, 같은 번호는 한 번", () => {
  assert.equal(phoneText({ officeTel: "031-917-1234", mobileTel: "010-1234-5678" }), "031-917-1234 · 010-1234-5678");
  assert.equal(phoneText({ officeTel: "", mobileTel: "010-1" }), "010-1");
  assert.equal(phoneText({ officeTel: "010-1", mobileTel: "010-1" }), "010-1");
  assert.equal(phoneText({}), "");
});

test("엑셀: 번호 칸 2개(없으면 빈칸) + 네이버 주소는 누르면 열리는 링크", () => {
  assert.equal(COLUMNS.indexOf("사무실 번호"), COLUMNS.indexOf("중개사 상호") + 1);
  const withTel = toTable([{ item: { ...item, officeTel: "031-917-1234", mobileTel: "010-1234-5678" }, status: "new" }]);
  const noTel = toTable([{ item, status: "new" }]);
  const ci = COLUMNS.indexOf("사무실 번호");
  assert.deepEqual(withTel[0].slice(ci, ci + 2), ["031-917-1234", "010-1234-5678"]);
  assert.deepEqual(noTel[0].slice(ci, ci + 2), ["", ""]);
  assert.ok(toCsv(withTel).includes("https://new.land.naver.com/complexes/107014?articleNo=9"));
  const text = new TextDecoder().decode(toXlsx(withTel));
  assert.ok(text.includes('HYPERLINK("https://new.land.naver.com/complexes/107014?articleNo=9","네이버에서 보기")'));
});

test("텔레그램·메일 요약: 번호가 있으면 📞 줄", () => {
  const t = buildSummary([{ name: "일산요진", total: 1, firstRun: false, events: [{ type: "new", item: { ...item, officeTel: "031-917-1234" } }] }]);
  assert.match(t, /📞 031-917-1234/);
  const n = buildSummary([{ name: "일산요진", total: 1, firstRun: false, events: [{ type: "new", item }] }]);
  assert.ok(!n.includes("📞"));
});
