// 회원 설정·복사 등록·파일 일괄 변경(외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePrefs, upsertNamed } from "../src/lib/coupang/prefs.ts";
import { buildCopyBody, checkCopyName } from "../src/lib/coupang/productCopy.ts";
import { BULK_FILE_MAX, parseBulkFile } from "../src/lib/coupang/bulk.ts";

test("설정을 정리하고 크기를 제한한다", () => {
  const p = normalizePrefs({ replyTemplates: [{ title: "배송", text: "안내" }, { title: "", text: "x" }], listingTemplates: [{ name: "가방", code: "69a579", searchVals: { 계절: "봄" } }, {}], unitCosts: { 1: 500 }, targetMargin: 15 });
  assert.equal(p.replyTemplates.length, 1);
  assert.equal(p.listingTemplates[0].code, "69579");
  assert.equal(p.unitCosts["1"], "500");
  assert.equal(p.targetMargin, "15");
  assert.deepEqual(normalizePrefs(null).replyTemplates, []);
  assert.deepEqual(upsertNamed([{ n: "a", v: 1 }, { n: "b", v: 2 }], { n: "a", v: 3 }, (x) => x.n), [{ n: "a", v: 3 }, { n: "b", v: 2 }]);
});

test("복사본은 번호·상태 없이 저장만 한다", () => {
  const raw = { data: { sellerProductId: 9, statusName: "승인완료", brand: "B", displayCategoryCode: 7, returnCenterCode: "R", requested: true, items: [{ sellerProductItemId: 1, vendorItemId: 2, itemName: "옵션", salePrice: 100, images: [{ cdnPath: "c", vendorPath: "v" }] }] } };
  const b = buildCopyBody(raw, { name: " 새 이름 ", vendorId: "A1", wingUserId: "w", saleStartedAt: "t" });
  assert.equal(b.sellerProductName, "새 이름");
  assert.equal(b.requested, false);
  assert.equal(b.sellerProductId, undefined);
  assert.equal(b.statusName, undefined);
  assert.equal(b.items[0].vendorItemId, undefined);
  assert.equal(b.items[0].sellerProductItemId, undefined);
  assert.deepEqual(b.items[0].images, [{ cdnPath: "c", vendorPath: "v" }]);
  assert.match(checkCopyName(" "), /상품명/);
});

test("파일 일괄 변경을 읽는다", () => {
  const r = parseBulkFile([
    { 옵션ID: "10", "새 판매가": "12,000", "새 재고": "" },
    { 옵션ID: "11", "새 판매가": "", "새 재고": "5" },
    { 옵션ID: "12", "새 판매가": "", "새 재고": "" },
    { 옵션ID: "x", "새 판매가": "100", "새 재고": "" },
    { 옵션ID: "13", "새 판매가": "12005", "새 재고": "" },
    { 옵션ID: "10", "새 판매가": "100", "새 재고": "" },
  ]);
  assert.deepEqual(r.entries, [{ vendorItemId: 10, price: 12000, qty: null }, { vendorItemId: 11, price: null, qty: 5 }]);
  assert.equal(r.problems.length, 3);
  assert.equal(parseBulkFile(Array.from({ length: BULK_FILE_MAX + 5 }, (_, i) => ({ 옵션ID: String(i + 1), "새 재고": "1" }))).entries.length, BULK_FILE_MAX);
});

test("S1 키 만료 안내", async () => {
  const { defaultKeyExpiry, isExpiryDate, keyExpiryNotice, normalizePrefs } = await import("../src/lib/coupang/prefs.ts");
  const now = Date.parse("2026-10-31T03:00:00Z");
  assert.equal(defaultKeyExpiry(now), "2027-04-30");
  assert.equal(defaultKeyExpiry(Date.parse("2026-11-15T03:00:00Z")), "2027-05-15");
  assert.equal(keyExpiryNotice("", now), null);
  assert.equal(keyExpiryNotice("2026-12-01", now), null);
  assert.equal(keyExpiryNotice("2026-11-30", now).level, "soon");
  assert.equal(keyExpiryNotice("2026-11-07", now).level, "urgent");
  assert.match(keyExpiryNotice("2026-10-31", now).text, /오늘/);
  assert.equal(keyExpiryNotice("2026-10-30", now).level, "expired");
  assert.equal(isExpiryDate("2026-02-30"), false);
  assert.equal(normalizePrefs({ wingKeyExpiry: "abc" }).wingKeyExpiry, "");
  assert.equal(normalizePrefs({ wingKeyExpiry: "2027-04-30" }).wingKeyExpiry, "2027-04-30");
});

test("플랫폼별 AI 모델 저장값 검사", async () => {
  const { cleanAiModels } = await import("../src/lib/coupang/prefs.ts");
  assert.deepEqual(cleanAiModels({ anthropic: "claude-haiku-5-5", openai: "claude-opus-5-5", gemini: "없는모델", etc: "x" }), { anthropic: "claude-haiku-5-5" });
  assert.deepEqual(cleanAiModels(null), {});
});
