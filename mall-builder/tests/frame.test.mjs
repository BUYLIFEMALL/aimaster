import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_FOOTER, DEFAULT_HEADER, DEFAULT_POPUP, readFooter, readHeader, readPopup, validateFooter, validateHeader, validatePopup } from "../src/lib/builder/frame.ts";

test("빈 값은 지금 틀 그대로(기본값)", () => {
  assert.deepEqual(readHeader(null), DEFAULT_HEADER);
  assert.deepEqual(readHeader({}), DEFAULT_HEADER);
  assert.deepEqual(readFooter(undefined), DEFAULT_FOOTER);
  assert.deepEqual(readPopup([]), DEFAULT_POPUP);
});

test("헤더 — 띠·로고·2단 메뉴·검색 모양", () => {
  const v = validateHeader({
    band: { text: " 전 상품 무료배송 ", link: "/s/x/notices", bg: "#B91C1C" },
    logo: "https://x.supabase.co/logo.png",
    menu: [{ label: "이벤트", link: "/s/x/notices", children: [{ label: "기획전", link: "https://ex.com/a" }] }, { label: "FAQ", link: "/s/x/faq" }],
    show_categories: false,
    search: "icon",
  });
  assert.ok(v.ok);
  assert.equal(v.value.band.text, "전 상품 무료배송");
  assert.equal(v.value.band.bg, "#b91c1c");
  assert.equal(v.value.menu[0].children.length, 1);
  assert.deepEqual(v.value.menu[1].children, []);
  assert.equal(v.value.show_categories, false);
  assert.equal(v.value.search, "icon");
});

test("헤더 — 위험한 링크·http 그림·이름 없는 메뉴·너무 많은 메뉴는 거절", () => {
  assert.match(validateHeader({ menu: [{ label: "x", link: "javascript:alert(1)" }] }).error, /링크/);
  assert.match(validateHeader({ logo: "http://x/a.png" }).error, /상단 로고/);
  assert.match(validateHeader({ menu: [{ label: "", link: "/a" }] }).error, /1번째 메뉴: 메뉴 이름/);
  assert.match(validateHeader({ menu: Array.from({ length: 9 }, () => ({ label: "a", link: "/a" })) }).error, /8개/);
  assert.match(validateHeader({ menu: [{ label: "a", link: "/a", children: [{ label: "b", link: "//evil.com" }] }] }).error, /아래 메뉴/);
  // 읽을 때는 틀린 칸만 버린다(그림 주소가 틀려도 띠·메뉴는 살림)
  const h = readHeader({ logo: "http://x/a.png", band: { text: "안내" }, menu: [{ label: "", link: "" }, { label: "FAQ", link: "/s/x/faq", children: [{ label: "", link: "" }] }] });
  assert.equal(h.logo, "");
  assert.equal(h.band.text, "안내");
  assert.deepEqual(h.menu, [{ label: "FAQ", link: "/s/x/faq", children: [] }]);
});

test("바닥글 — 링크 묶음·안내 문구·입금 계좌 끄기", () => {
  const v = validateFooter({ columns: [{ title: "고객센터", links: [{ label: "FAQ", link: "/s/x/faq" }] }], note: "평일 9시~6시", show_bank: false });
  assert.ok(v.ok);
  assert.equal(v.value.columns[0].links[0].label, "FAQ");
  assert.equal(v.value.show_bank, false);
  assert.match(validateFooter({ columns: [{}, {}, {}, {}] }).error, /3개/);
  assert.match(validateFooter({ note: "가".repeat(501) }).error, /500자/);
});

test("팝업 — 그림 필수, 3장까지, 보지 않기 1~30일", () => {
  const v = validatePopup({ items: [{ image: "https://x.supabase.co/p.png", link: "" }], hide_days: 7 });
  assert.ok(v.ok);
  assert.equal(v.value.hide_days, 7);
  assert.equal(validatePopup({ items: [], hide_days: 99 }).value.hide_days, 1);
  assert.match(validatePopup({ items: [{ image: "", link: "" }] }).error, /그림을 올려/);
  assert.match(validatePopup({ items: Array.from({ length: 4 }, () => ({ image: "https://x/a.png" })) }).error, /3장/);
});

test("읽기는 너그럽게 — 빈 링크·그림 없는 팝업은 건너뛰고 나머지는 그린다", () => {
  const f = readFooter({ columns: [{ title: "고객센터", links: [{ label: "", link: "" }, { label: "FAQ", link: "/s/x/faq" }] }], note: "안내" });
  assert.deepEqual(f.columns[0].links, [{ label: "FAQ", link: "/s/x/faq" }]);
  assert.equal(f.note, "안내");
  const p = readPopup({ items: [{ image: "", link: "" }, { image: "https://x.supabase.co/p.png", link: "" }], hide_days: 3 });
  assert.equal(p.items.length, 1);
  assert.equal(p.hide_days, 3);
});
