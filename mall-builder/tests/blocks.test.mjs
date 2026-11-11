import { test } from "node:test";
import assert from "node:assert/strict";
import { validateDoc, newBlock, moveBlock, safeLink, safeImage, readDoc, BLOCK_TYPES } from "../src/lib/blocks.ts";

const IMG = "https://x.supabase.co/storage/v1/object/public/mall-builder-public/s/banners/a.jpg";

test("링크·그림 주소 검사", () => {
  assert.equal(safeLink(""), "");
  assert.equal(safeLink("/s/aimaster-b2b/c/1"), "/s/aimaster-b2b/c/1");
  assert.equal(safeLink("https://buylife.kr/a"), "https://buylife.kr/a");
  assert.equal(safeLink("javascript:alert(1)"), null);
  assert.equal(safeLink("//evil.com"), null);
  assert.equal(safeLink("http://x.com"), null);
  assert.equal(safeImage(IMG), IMG);
  assert.equal(safeImage("data:image/png;base64,xx"), null);
});

test("블록 종류마다 기본값으로 만들 수 있다(슬라이드·배너는 그림이 있어야 저장)", () => {
  for (const t of BLOCK_TYPES) assert.equal(newBlock(t, "x").type, t);
  assert.equal(validateDoc({ blocks: [newBlock("topbar", "a")] }).ok, true);
  assert.match(validateDoc({ blocks: [newBlock("banner", "a")] }).error, /1번째 블록\(단일 배너\): 배너 그림/);
  assert.match(validateDoc({ blocks: [newBlock("slider", "a")] }).error, /슬라이드 그림은 1~8장/);
});

test("저장 전 검사·정리", () => {
  const ok = validateDoc({
    blocks: [
      { id: "t", type: "topbar", visible: true, settings: { items: [{ text: " 신규 10% ", link: "/s/x/join", bg: "#ff0000" }], rotate_sec: 99 } },
      { id: "s", type: "slider", visible: false, settings: { slides: [{ image: IMG, link: "" }], height: 1, autoplay_sec: 3 } },
      { id: "b", type: "banner", settings: { image: IMG, link: "https://buylife.kr", max_width: 900 } },
    ],
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.blocks[0].settings.items[0].text, "신규 10%");
  assert.equal(ok.value.blocks[0].settings.rotate_sec, 4); // 범위 밖이면 기본값
  assert.equal(ok.value.blocks[1].visible, false);
  assert.equal(ok.value.blocks[1].settings.height, 400);
  assert.equal(ok.value.blocks[2].visible, true);
  assert.match(validateDoc({ blocks: [{ id: "x", type: "script", settings: {} }] }).error, /종류를 알 수 없/);
  assert.match(validateDoc({ blocks: [{ id: "a", type: "topbar", settings: { items: [{ text: "a", link: "javascript:x" }] } }] }).error, /링크/);
  assert.match(validateDoc({ blocks: [newBlock("topbar", "a"), newBlock("topbar", "a")] }).error, /겹칩니다/);
  assert.match(validateDoc({ blocks: Array.from({ length: 31 }, (_, i) => newBlock("topbar", `t${i}`)) }).error, /30개/);
});

test("휴대폰용 그림(선택) — 옛 저장본은 빈 값, 넣으면 https만", () => {
  const M = IMG.replace("a.jpg", "m.jpg");
  const old = readDoc({ blocks: [{ id: "b", type: "banner", settings: { image: IMG, link: "" } }, { id: "s", type: "slider", settings: { slides: [{ image: IMG }] } }] });
  assert.equal(old.blocks[0].settings.mobile_image, "");
  assert.equal(old.blocks[1].settings.slides[0].mobile_image, "");
  const ok = validateDoc({ blocks: [{ id: "b", type: "banner", settings: { image: IMG, mobile_image: ` ${M} `, link: "" } }, { id: "s", type: "slider", settings: { slides: [{ image: IMG, mobile_image: M, link: "" }] } }] });
  assert.equal(ok.value.blocks[0].settings.mobile_image, M);
  assert.equal(ok.value.blocks[1].settings.slides[0].mobile_image, M);
  assert.match(validateDoc({ blocks: [{ id: "b", type: "banner", settings: { image: IMG, mobile_image: "http://x/a.jpg" } }] }).error, /휴대폰용 그림/);
  assert.match(validateDoc({ blocks: [{ id: "s", type: "slider", settings: { slides: [{ image: IMG, mobile_image: "javascript:x" }] } }] }).error, /1번째 블록\(슬라이드 배너\): 휴대폰용 그림/);
});

test("글·HTML 블록 위험 태그 제거", () => {
  const dirty = `<h3 onclick="x()">안내</h3><script>alert(1)</script><p style="color:red">본문 <a href="javascript:alert(1)">나쁜</a> <a href="https://buylife.kr">좋은</a> <a href="/s/x/c/1">안쪽</a></p>`
    + `<img src="x" onerror="alert(1)"><img src="https://a.com/b.png"><iframe src="https://evil.com"></iframe><style>body{}</style><form><input></form>`;
  const v = validateDoc({ blocks: [{ id: "h", type: "html", settings: { html: dirty } }] });
  assert.equal(v.ok, true);
  const html = v.value.blocks[0].settings.html;
  for (const bad of ["script", "onclick", "onerror", "style", "javascript:", "iframe", "<form", "<input", 'src="x"']) assert.equal(html.includes(bad), false, bad);
  assert.match(html, /<h3>안내<\/h3>/);
  assert.match(html, /<a href="https:\/\/buylife.kr" target="_blank" rel="noopener noreferrer">좋은<\/a>/);
  assert.match(html, /<a href="\/s\/x\/c\/1">안쪽<\/a>/);
  assert.match(html, /<img src="https:\/\/a.com\/b.png" \/>/);
  assert.match(validateDoc({ blocks: [{ id: "h", type: "html", settings: { html: "<script>x</script>" } }] }).error, /글 내용/);
  // 손님 화면 읽기(readDoc)에서도 다시 지운다 — DB에 직접 넣은 위험 태그 대비
  assert.equal(readDoc({ blocks: [{ id: "h", type: "html", visible: true, settings: { html: "<p>a</p><script>b</script>" } }] }).blocks[0].settings.html, "<p>a</p>");
});

test("상품 쇼윈도·공지 검사", () => {
  const C = "11111111-2222-3333-4444-555555555555";
  assert.match(validateDoc({ blocks: [{ id: "s", type: "showcase", settings: { source: "category" } }] }).error, /카테고리를 골라/);
  assert.match(validateDoc({ blocks: [{ id: "s", type: "showcase", settings: { source: "manual", product_ids: ["x"] } }] }).error, /상품을 1개 이상/);
  const ok = validateDoc({ blocks: [
    { id: "a", type: "showcase", settings: { title: "특가", source: "manual", product_ids: [C, C, "bad"], columns: 9, limit: 6, category_id: C } },
    { id: "b", type: "showcase", settings: { source: "new" } },
    { id: "n", type: "notice", settings: { count: 99 } },
  ] });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.value.blocks[0].settings.product_ids, [C]); // 중복·잘못된 번호 제거
  assert.equal(ok.value.blocks[0].settings.category_id, ""); // 직접 선택이면 카테고리 비움
  assert.equal(ok.value.blocks[0].settings.columns, 4);
  assert.equal(ok.value.blocks[1].settings.limit, 8);
  assert.deepEqual(ok.value.blocks[2].settings, { title: "공지사항", count: 5 });
});

test("순서 바꾸기·망가진 문서 읽기", () => {
  const bs = [newBlock("topbar", "1"), newBlock("topbar", "2"), newBlock("topbar", "3")];
  assert.deepEqual(moveBlock(bs, 0, 1).map((b) => b.id), ["2", "1", "3"]);
  assert.deepEqual(moveBlock(bs, 0, -1).map((b) => b.id), ["1", "2", "3"]);
  assert.deepEqual(readDoc({ blocks: "망가짐" }).blocks, []);
  assert.deepEqual(readDoc(null).blocks, []);
});

// ── D28 새 블록 6종·예약 노출 ──
import { videoEmbed, isLive, isoOrEmpty, BLOCK_DEFS as D28 } from "../src/lib/blocks.ts";
const U1 = "11111111-1111-1111-1111-111111111111";
const U2 = "22222222-2222-2222-2222-222222222222";

test("D28 동영상 주소 — 유튜브(여러 모양)·비메오만, 쿠키 없는 주소", () => {
  assert.equal(videoEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(videoEmbed("https://youtu.be/dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(videoEmbed("https://youtube.com/shorts/dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(videoEmbed("https://vimeo.com/123456789"), "https://player.vimeo.com/video/123456789");
  assert.equal(videoEmbed("http://youtu.be/dQw4w9WgXcQ"), null);
  assert.equal(videoEmbed("https://evil.example/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(videoEmbed("https://youtu.be/dQw4w9WgXcQ\"><script>"), null);
  assert.equal(D28.video.validate({ url: "https://example.com" }).ok, false);
});

test("D28 탭 상품 — 2~5개, 탭마다 상품 고르는 방법 검사", () => {
  assert.equal(D28.tabs.validate({ tabs: [{ label: "A", source: "new" }] }).ok, false);
  const bad = D28.tabs.validate({ tabs: [{ label: "A", source: "new" }, { label: "B", source: "category", category_id: "" }] });
  assert.match(bad.error, /2번째 탭: 보여 줄 카테고리/);
  const ok = D28.tabs.validate({ tabs: [{ label: "A", source: "new" }, { label: "B", source: "manual", product_ids: [U1, U1, "x"] }] });
  assert.deepEqual(ok.value.tabs[1].product_ids, [U1]);
});

test("D28 타임세일·갤러리·카테고리 바로가기·후기 검사", () => {
  assert.match(D28.timesale.validate({ title: "특가", ends_at: "" }).error, /끝나는 시각/);
  assert.equal(D28.timesale.validate({ title: "특가", ends_at: "2026-12-01T10:00:00+09:00", source: "new" }).value.ends_at, "2026-12-01T01:00:00.000Z");
  assert.equal(D28.gallery.validate({ items: [{ image: "http://x.png" }] }).ok, false);
  assert.equal(D28.gallery.validate({ items: [{ image: "https://x.png", link: "/s/a" }] }).ok, true);
  assert.equal(D28.category_icons.validate({ items: [{ category_id: U1 }] }).ok, false);
  assert.equal(D28.category_icons.validate({ items: [{ category_id: U1, emoji: "🍎🍏🍐" }, { category_id: U2 }] }).value.items[0].emoji, "🍎🍏");
  assert.deepEqual(D28.reviews.validate({ count: 99, min_rating: 9 }).value, { title: "구매 후기", count: 6, min_rating: 4 });
});

test("D28 예약 노출 — 시작·끝 시각, 타임세일은 끝나면 숨김, 시각 순서 검사", () => {
  const b = (o) => ({ id: "x", type: "html", visible: true, settings: { html: "<p>a</p>" }, ...o });
  const now = Date.parse("2026-11-11T03:00:00Z");
  assert.equal(isLive(b({}), now), true);
  assert.equal(isLive(b({ show_from: "2026-11-11T04:00:00Z" }), now), false);
  assert.equal(isLive(b({ show_until: "2026-11-11T03:00:00Z" }), now), false);
  assert.equal(isLive(b({ visible: false }), now), false);
  assert.equal(isLive({ id: "t", type: "timesale", visible: true, settings: { ends_at: "2026-11-11T02:59:00Z" } }, now), false);
  assert.equal(isoOrEmpty("엉터리"), null);
  const v = validateDoc({ blocks: [b({ show_from: "2026-11-12T00:00:00Z", show_until: "2026-11-11T00:00:00Z" })] });
  assert.match(v.error, /끝 시각이 시작 시각보다/);
  const kept = validateDoc({ blocks: [b({ show_from: "2026-11-12T09:00:00+09:00" })] });
  assert.equal(kept.value.blocks[0].show_from, "2026-11-12T00:00:00.000Z");
  assert.equal("show_until" in kept.value.blocks[0], false); // 옛 저장본처럼 칸 없음
});
