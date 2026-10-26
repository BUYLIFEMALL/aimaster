// v1.37(E3) 순수 함수 시험 — 실행: node --experimental-strip-types scripts/test-e3.mts
import test from "node:test";
import assert from "node:assert/strict";
import { EMPTY_NOTICE, normalizeNotice, noticeRows, noticeHtml, escapeHtml, wrapText, toCopyTone, stripRiskyClaims, cleanCopy, copyBundleText } from "../lib/detailBlocks.ts";

test("배송 안내: 정리·채운 칸만·HTML 이스케이프", () => {
  const n = normalizeNotice({ courier: "CJ대한통운", shipFee: "3,000원", hack: "x", returnAddress: 5 });
  assert.equal(n.courier, "CJ대한통운");
  assert.equal(n.returnAddress, "");
  assert.equal((n as unknown as Record<string, unknown>).hack, undefined);
  assert.deepEqual(noticeRows(n), [["택배사", "CJ대한통운"], ["배송비", "3,000원"]]);
  assert.equal(noticeHtml(EMPTY_NOTICE), "");
  const h = noticeHtml({ ...EMPTY_NOTICE, contact: '<script>alert(1)</script> "톡톡"' });
  assert.ok(!h.includes("<script>"));
  assert.ok(h.includes("&lt;script&gt;") && h.includes("&quot;톡톡&quot;"));
  assert.ok(h.includes('data-block="shipping-notice"'));
  assert.equal(escapeHtml("a&b"), "a&amp;b");
  assert.equal(normalizeNotice({ extra: "가".repeat(500) }).extra.length, 300);
});

test("줄 나누기: 폭을 넘으면 글자 단위로 다음 줄", () => {
  const m = (s: string) => s.length * 10;
  assert.deepEqual(wrapText("가나다라마", 30, m), ["가나다", "라마"]);
  assert.deepEqual(wrapText("가나\n다", 100, m), ["가나", "다"]);
});

test("말투: 모르는 값은 친근한", () => {
  assert.equal(toCopyTone("premium"), "premium");
  assert.equal(toCopyTone("urgent"), "friendly");
});

test("위험 문구 빼기: 근거 없는 판매량·후기·한정·임상 문장 제거, 상품 정보에 있으면 허용", () => {
  const t = "가볍고 튼튼합니다. 누적 판매 5만 개를 넘었어요! 한정 수량이니 서두르세요. 하루 종일 따뜻해요.";
  assert.equal(stripRiskyClaims(t, ""), "가볍고 튼튼합니다. 하루 종일 따뜻해요.");
  assert.equal(stripRiskyClaims("KC인증 받은 제품입니다.", "KC인증"), "KC인증 받은 제품입니다.");
  assert.equal(stripRiskyClaims("3,847명이 선택한 텀블러.", ""), "");
  assert.equal(stripRiskyClaims("만족도 97%!", ""), "");
});

test("결과 정리·묶음 복사", () => {
  const c = cleanCopy({ names: ["A", "B", "C", "D"], oneLine: "좋아요", body: "튼튼합니다. 재구매율 92%입니다.", sns: ["s1", "s2", "s3"], extra: 1 }, "");
  assert.deepEqual(c.names, ["A", "B", "C"]);
  assert.equal(c.body, "튼튼합니다.");
  assert.equal(c.sns.length, 2);
  const b = copyBundleText(c);
  assert.ok(b.startsWith("[상품명 후보]\n1. A"));
  assert.ok(b.includes("[SNS 문구 2]\ns2"));
  assert.deepEqual(cleanCopy(null, ""), { names: [], oneLine: "", body: "", sns: [] });
});
