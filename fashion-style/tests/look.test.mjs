import test from "node:test";
import assert from "node:assert/strict";
import { bestAspectRatio, fitWithin, isAspectRatio } from "../src/lib/look/aspect.ts";
import { cleanSituation, recommendPrompt, tryOnPrompt, beautyAdvicePrompt, itemImagePrompt, beautyApplyPrompt } from "../src/lib/look/prompts.ts";
import { validateImage, parseSuggestions, parseBeauty } from "../src/lib/look/validate.ts";
import { checkImageUrl, isPrivateAddress } from "../src/lib/look/ssrf.ts";
import { emptyHistory, pushResult, undo, redo, canUndo, MAX_HISTORY } from "../src/lib/look/history.ts";
import { STRINGS } from "../src/lib/look/i18n.ts";
import { sanitizeSettings } from "../src/lib/look/storage.ts";

test("종횡비: 가장 가까운 지원 비율", () => {
  assert.equal(bestAspectRatio(1000, 1000), "1:1");
  assert.equal(bestAspectRatio(900, 1200), "3:4");
  assert.equal(bestAspectRatio(1200, 900), "4:3");
  assert.equal(bestAspectRatio(1080, 1920), "9:16");
  assert.equal(bestAspectRatio(1920, 1080), "16:9");
  assert.equal(bestAspectRatio(500, 2000), "9:16");
  assert.equal(bestAspectRatio(3000, 800), "16:9");
  assert.equal(bestAspectRatio(0, 10), "1:1");
  assert.equal(isAspectRatio("3:4"), true);
  assert.equal(isAspectRatio("2:3"), false);
});

test("축소 크기 계산", () => {
  assert.deepEqual(fitWithin(800, 600, 1600), { width: 800, height: 600 });
  assert.deepEqual(fitWithin(3200, 1600, 1600), { width: 1600, height: 800 });
  assert.deepEqual(fitWithin(1000, 4000, 1600), { width: 400, height: 1600 });
});

test("상황 문구 정리: 길이·제어문자·따옴표", () => {
  assert.equal(cleanSituation('  면접 "프롬프트\n주입" `x` \\ '), "면접 프롬프트 주입 x");
  assert.equal(cleanSituation("a".repeat(200)).length, 80);
  assert.equal(cleanSituation(null), "");
});

test("프롬프트: 연도·한국인·배경 규칙", () => {
  const p = recommendPrompt("outfit", "소개팅", 2026);
  assert.ok(p.includes("2026") && p.includes("소개팅") && p.includes("exactly two"));
  assert.ok(recommendPrompt("accessory", "파티", 2026).includes("ACCESSORIES"));
  assert.ok(tryOnPrompt("keep").includes("exactly the same"));
  assert.ok(tryOnPrompt("match", "면접").includes("면접"));
  assert.ok(tryOnPrompt("match").includes("exactly the same")); // 상황이 없으면 유지
  assert.ok(beautyAdvicePrompt("ko", 2026).includes("KOREAN"));
  assert.ok(beautyAdvicePrompt("en", 2026).includes("Korean"));
  assert.ok(itemImagePrompt("a red coat").includes("white background"));
  assert.ok(beautyApplyPrompt("hair", "short bob").includes("hairstyle"));
});

test("이미지 검증", () => {
  const ok = "A".repeat(200);
  assert.deepEqual(validateImage({ data: ok, mimeType: "image/jpeg" }), { data: ok, mimeType: "image/jpeg" });
  assert.equal(validateImage({ data: ok, mimeType: "image/gif" }), null);
  assert.equal(validateImage({ data: "A".repeat(3_500_000), mimeType: "image/png" }), null);
  assert.equal(validateImage({ data: "not base64!!" + "A".repeat(200), mimeType: "image/png" }), null);
  assert.equal(validateImage(null), null);
});

test("추천 응답 검증·정리", () => {
  const good = [
    { name: "면접룩", pieces: [{ name: "셔츠", imagePrompt: "white shirt" }, { name: "", imagePrompt: "x" }, { name: "슬랙스", imagePrompt: "black slacks" }] },
    { name: "x" },
  ];
  const r = parseSuggestions(good);
  assert.equal(r.length, 1);
  assert.equal(r[0].pieces.length, 2);
  assert.equal(parseSuggestions([]), null);
  assert.equal(parseSuggestions("x"), null);
  assert.equal(parseSuggestions([{ name: "a", pieces: [] }]), null);
});

test("뷰티 응답 검증", () => {
  const part = { title: "t", description: "d", imagePrompt: "p" };
  assert.deepEqual(parseBeauty({ makeup: part, hairstyle: part }), { makeup: part, hairstyle: part });
  assert.equal(parseBeauty({ makeup: part }), null);
  assert.equal(parseBeauty({ makeup: part, hairstyle: { title: "t" } }), null);
});

test("SSRF: 내부 주소 차단", () => {
  for (const ip of ["127.0.0.1", "10.0.0.5", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "224.0.0.1"]) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700:4700::1111"]) assert.equal(isPrivateAddress(ip), false, ip);
});

test("SSRF: URL 검사", () => {
  assert.equal(checkImageUrl("https://example.com/a.jpg").ok, true);
  for (const bad of ["ftp://x.com/a.jpg", "http://localhost/a.jpg", "http://127.0.0.1/a.jpg", "http://169.254.169.254/latest", "https://user:pw@example.com/a", "https://example.com:8443/a", "http://foo.internal/a", "http://[::1]/a", "not a url", "file:///etc/passwd", "javascript:alert(1)"]) {
    assert.equal(checkImageUrl(bad).ok, false, bad);
  }
});

test("히스토리: 쌓기·되돌리기·다시 실행·상한", () => {
  let h = emptyHistory();
  assert.equal(canUndo(h), false);
  h = pushResult(h, "a");
  h = pushResult(h, "b");
  assert.equal(h.present, "b");
  h = undo(h);
  assert.equal(h.present, "a");
  h = undo(h);
  assert.equal(h.present, null); // 원본으로
  assert.equal(canUndo(h), false);
  h = redo(h);
  assert.equal(h.present, "a");
  h = redo(h);
  assert.equal(h.present, "b");
  h = undo(h);
  h = pushResult(h, "c"); // 새 결과가 생기면 다시 실행 목록은 비워진다
  assert.deepEqual(h.future, []);
  let big = emptyHistory();
  for (let i = 0; i < 30; i += 1) big = pushResult(big, `v${i}`);
  assert.ok(big.past.length <= MAX_HISTORY);
});

test("번역: 한국어/영어 키가 같고 비어 있지 않다", () => {
  const ko = Object.keys(STRINGS.ko).sort();
  const en = Object.keys(STRINGS.en).sort();
  assert.deepEqual(ko, en);
  for (const k of ko) {
    assert.ok(STRINGS.ko[k].length > 0, `ko ${k}`);
    assert.ok(STRINGS.en[k].length > 0, `en ${k}`);
  }
});

test("설정 보정", () => {
  assert.deepEqual(sanitizeSettings(null), { lang: "ko", model: "standard", editMode: "add", background: "keep", consent: false });
  assert.deepEqual(
    sanitizeSettings({ lang: "en", model: "pro", editMode: "replace", background: "match", consent: 1 }),
    { lang: "en", model: "pro", editMode: "replace", background: "match", consent: true },
  );
  assert.equal(sanitizeSettings({ lang: "jp" }).lang, "ko");
});
