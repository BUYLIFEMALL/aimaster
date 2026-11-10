import { test } from "node:test";
import assert from "node:assert/strict";
import { buildHomePrompt, draftToBlocks, HomeDraftSchema, MAX_AI_BLOCKS } from "../src/lib/aiHome.ts";
import { validateDoc } from "../src/lib/blocks.ts";

const C1 = "11111111-1111-4111-8111-111111111111";
const C2 = "22222222-2222-4222-8222-222222222222";
const C3 = "33333333-3333-4333-8333-333333333333";
const facts = { categories: [{ id: C1, name: "복사지" }, { id: C2, name: "토너" }, { id: C3, name: "필기구" }], hasReviews: true, hasNotices: false };
const blk = (o) => ({ type: "showcase", title: "", texts: [], source: "new", category_ids: [], labels: [], emojis: [], ...o });

test("프롬프트에 연도·카테고리 id·업종", () => {
  const p = buildHomePrompt({ storeName: "가나몰", industry: "사무용품 도매", categories: facts.categories, productNames: ["A4"], productCount: 3, hasReviews: true, hasNotices: false }, 2026);
  assert.match(p.system, /2026년/);
  assert.match(p.user, new RegExp(`${C1}: 복사지`));
  assert.match(p.user, /사무용품 도매/);
  assert.match(p.user, /공지 없음/);
});

test("여러 종류를 블록으로 바꾸고, 결과가 등록표 검사를 통과", () => {
  const { blocks, dropped } = draftToBlocks({
    note: "",
    blocks: [
      blk({ type: "topbar", texts: ["사업자 회원 가입하면 도매가", "대량 구매 견적 문의 환영"] }),
      blk({ type: "showcase", title: "복사지 모음", source: "category", category_ids: [C1] }),
      blk({ type: "tabs", title: "분류별", category_ids: [C1, C2, "없는id"], labels: ["종이", "토너", "x"] }),
      blk({ type: "category_icons", category_ids: [C1, C2, C3], emojis: ["📄", "🖨", "✏️"] }),
      blk({ type: "reviews", title: "후기" }),
      blk({ type: "notice", title: "공지" }),
    ],
  }, facts, (i) => `t${i}`);
  assert.deepEqual(blocks.map((b) => b.type), ["topbar", "showcase", "tabs", "category_icons", "reviews"]);
  assert.equal(dropped, 1); // 공지 없음 → 뺌
  assert.equal(blocks[1].settings.category_id, C1);
  assert.deepEqual(blocks[2].settings.tabs.map((t) => t.label), ["종이", "토너"]);
  assert.equal(blocks[3].settings.items[2].emoji, "✏️");
  assert.ok(validateDoc({ schema_version: 1, blocks }).ok);
});

test("모르는 카테고리면 쇼윈도는 신상품으로, 탭이 1개뿐이면 뺀다", () => {
  const { blocks, dropped } = draftToBlocks({ note: "", blocks: [
    blk({ type: "showcase", source: "category", category_ids: ["nope"] }),
    blk({ type: "tabs", category_ids: [C1], labels: ["a"] }),
  ] }, facts);
  assert.equal(blocks[0].settings.source, "new");
  assert.equal(blocks.length, 1);
  assert.equal(dropped, 1);
});

test("같은 종류 2개까지, 최대 블록 수", () => {
  const many = Array.from({ length: 12 }, (_, i) => blk({ type: i % 2 ? "showcase" : "topbar", texts: ["안내"] }));
  const { blocks } = draftToBlocks({ note: "", blocks: many }, facts);
  assert.ok(blocks.length <= MAX_AI_BLOCKS);
  assert.equal(blocks.filter((b) => b.type === "topbar").length, 2);
  assert.ok(HomeDraftSchema.safeParse({ note: "", blocks: [blk({})] }).success);
});

test("프롬프트: 설명은 한국어 블록 이름으로", () => {
  const p = buildHomePrompt({ storeName: "a", industry: "b", categories: [], productNames: [], productCount: 0, hasReviews: false, hasNotices: false }, 2026);
  assert.match(p.system, /영어 대신 띠 배너/);
});
