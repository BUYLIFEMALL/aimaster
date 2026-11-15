import test from "node:test";
import assert from "node:assert/strict";
import { adBand, adDescLine, aiBand, aiMarkOn, allChecked, defaultDisclosure, ensureAdLead, isCoupangUrl, normalizeDisclosure, AD_KINDS } from "../src/lib/disclosure.ts";

const base = (extra: Record<string, unknown> = {}) => ({
  topic: "t", category: "c", tone: "friendly", format: "product", source: "ai", hashtags: [],
  intro: { eyebrow: "", title: "제목", narration: "인트로" }, cards: [{ title: "a", desc: "", narration: "카드" }],
  outro: { title: "끝", subtitle: "", cta: [], narration: "아웃트로" }, ...extra,
}) as never;

test("쿠팡 주소를 알아본다(단축 링크 포함, 비슷한 이름은 아님)", () => {
  assert.equal(isCoupangUrl("https://link.coupang.com/a/abc"), true);
  assert.equal(isCoupangUrl("https://coupa.ng/xyz"), true);
  assert.equal(isCoupangUrl("https://www.coupang.com/vp/products/1"), true);
  assert.equal(isCoupangUrl("https://notcoupang.com/x"), false);
  assert.equal(isCoupangUrl("잘못된 주소"), false);
});

test("처음 값: 쿠팡 주소 → 쿠팡 파트너스, 다른 주소 → 제휴, 주소 없음 → 광고 아님", () => {
  assert.equal(defaultDisclosure(base({ product: { url: "https://coupa.ng/x" } })).ad, "coupang");
  assert.equal(defaultDisclosure(base({ product: { url: "https://smartstore.naver.com/a" } })).ad, "affiliate");
  assert.equal(defaultDisclosure(base()).ad, "off");
  assert.equal(defaultDisclosure(base()).aiMark, true);
});

test("광고 아님이면 띠·설명란 고지가 비어 있다", () => {
  assert.equal(adBand(base()), "");
  assert.equal(adDescLine(base()), "");
});

test("직접 입력은 「광고 ·」를 붙이고 비어 있으면 기본 문구", () => {
  assert.equal(adBand(base({ disclosure: { ad: "custom", custom: "원고료 받음", aiMark: true } })), "광고 · 원고료 받음");
  assert.equal(adBand(base({ disclosure: { ad: "custom", custom: " ", aiMark: true } })), "광고 · 유료 광고 포함");
  assert.match(adDescLine(base({ disclosure: { ad: "custom", custom: "<b>x</b>", aiMark: true } })), /^\[광고\] bx\/b$/);
});

test("AI 음성을 쓰면 AI 표기를 끌 수 없다", () => {
  const voiced = base({ disclosure: { ad: "off", aiMark: false }, intro: { eyebrow: "", title: "제목", narration: "인트로", voice: { path: "p", dur: 2, text: "인트로" } } });
  assert.equal(aiMarkOn(voiced), true);
  assert.equal(aiBand(voiced), "AI로 만든 영상 · AI 음성");
  const off = base({ disclosure: { ad: "off", aiMark: false } });
  assert.equal(aiMarkOn(off), false);
  assert.equal(aiBand(off), "");
  // 내레이션이 바뀌어 쓸 수 없게 된 옛 음성은 세지 않는다
  const stale = base({ disclosure: { ad: "off", aiMark: false }, intro: { eyebrow: "", title: "제목", narration: "새 문장", voice: { path: "p", dur: 2, text: "옛 문장" } } });
  assert.equal(aiMarkOn(stale), false);
});

test("설명란 첫 줄에 광고 고지를 한 번만 둔다(회원이 지우거나 아래로 옮겨도)", () => {
  const s = base({ disclosure: { ad: "coupang", aiMark: true } });
  const lead = AD_KINDS.coupang.desc;
  assert.equal(ensureAdLead("본문", s), `${lead}\n\n본문`);
  assert.equal(ensureAdLead(`본문\n\n${lead}`, s), `${lead}\n\n본문`);
  assert.equal(ensureAdLead(`${lead}\n\n본문`, s), `${lead}\n\n본문`);
  assert.equal(ensureAdLead("본문", base()), "본문");
});

test("게시 전 확인은 4개 모두여야 통과", () => {
  assert.equal(allChecked(base()), false);
  assert.equal(allChecked(base({ disclosure: { ad: "off", aiMark: true, checked: { facts: true, rights: true, ai: true } } })), false);
  assert.equal(allChecked(base({ disclosure: { ad: "off", aiMark: true, checked: { facts: true, rights: true, ai: true, ad: true } } })), true);
});

test("저장값이 이상하면 처음 값으로 읽되 체크는 유지", () => {
  const d = normalizeDisclosure(base({ product: { url: "https://coupa.ng/x" }, disclosure: { ad: "???", checked: { facts: true } } }));
  assert.equal(d.ad, "coupang");
  assert.equal(d.checked?.facts, true);
});
