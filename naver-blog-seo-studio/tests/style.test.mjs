import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeStyle, cleanSamples, parseBlogId, profileHash, isStyleApproved, withStyleApproval, detectEnding } from "../lib/style.ts";
import { styleSection } from "../lib/ai/stylePrompt.ts";
import { parseNaverRss } from "../lib/naverRssParse.ts";

const raw = { summary: "생활 정보를 차분하게 정리하는 블로그", tone: "친근한 존댓말", sentence: "짧은 문장 위주", structure: "요약 → 소제목 3개 → 정리", reader: "30대 직장인", expressions: ["정리해 보면", "", 3], avoid: ["무조건"], strengths: ["예시가 구체적"], cautions: ["과장 금지"], extra: "무시" };

test("BLC-08b: normalizeStyle keeps known fields only and rejects an empty summary", () => {
  const p = normalizeStyle(raw);
  assert.equal(p.summary, raw.summary);
  assert.deepEqual(p.expressions, ["정리해 보면"]);
  assert.equal("extra" in p, false);
  assert.equal(normalizeStyle({ tone: "x" }), null);
  assert.equal(normalizeStyle(null), null);
});

test("BLC-08b: samples need 40+ chars (max 10); blog id from URL or bare id", () => {
  assert.deepEqual(cleanSamples(["짧음", "가".repeat(40), 5]), ["가".repeat(40)]);
  assert.equal(cleanSamples(Array.from({ length: 12 }, () => "나".repeat(50))).length, 10);
  assert.equal(parseBlogId("https://blog.naver.com/BuyLifeMall/224450000365"), "buylifemall");
  assert.equal(parseBlogId("my_blog-1"), "my_blog-1");
  assert.equal(parseBlogId("https://example.com/x"), null);
  assert.equal(parseBlogId("a b"), null);
});

test("BLC-08b: approval follows the exact profile; edits after approval invalidate it", () => {
  const profile = normalizeStyle(raw);
  const row = { id: "s1", profile, approved_at: "2026-10-22T00:00:00Z", approval_hash: profileHash(profile) };
  assert.equal(isStyleApproved(row), true);
  assert.equal(withStyleApproval(row).approval_valid, true);
  assert.equal(isStyleApproved({ ...row, profile: { ...profile, tone: "반말" } }), false);
  assert.equal(isStyleApproved({ ...row, approved_at: null }), false);
  assert.equal(isStyleApproved({ profile: null, approved_at: "x", approval_hash: "y" }), false);
});

test("BLC-08b: no style -> empty section (prompt unchanged); style -> tone/structure guidance", () => {
  assert.equal(styleSection(undefined), "");
  const s = styleSection({ name: "내 블로그", profile: normalizeStyle(raw) });
  assert.match(s, /「내 블로그」 문체/);
  assert.match(s, /어조: 친근한 존댓말/);
  assert.match(s, /쓰지 않는 표현: 무조건/);
  // v1.86: 실검수에서 페르소나 「-습니다」체가 문체 말투를 덮어씀 → 말투·끝맺음은 문체 우선
  assert.match(s, /페르소나 톤보다 이 문체를 우선/);
});

test("BLC-08b: parseNaverRss reads channel name and naver post items only", () => {
  const xml = `<rss><channel><title><![CDATA[바이라이프 블로그]]></title><item><title><![CDATA[첫 글 &amp; 정리]]></title><link>https://blog.naver.com/buylifemall/1?fromRss=true</link><description><![CDATA[<p>요약입니다</p>]]></description></item><item><title>외부 글</title><link>https://example.com/2</link><description>x</description></item><item><title>둘째 글</title><link>https://blog.naver.com/buylifemall/3</link><description>요약2</description></item></channel></rss>`;
  const r = parseNaverRss(xml);
  assert.equal(r.name, "바이라이프 블로그");
  assert.deepEqual(r.posts.map((p) => p.title), ["첫 글 & 정리", "둘째 글"]);
  assert.equal(r.posts[0].summary, "요약입니다");
  assert.equal(parseNaverRss(xml, 1).posts.length, 1);
});

test("BLC-08b: approval survives jsonb key reordering (hash uses a fixed field order)", () => {
  const profile = normalizeStyle(raw);
  const reordered = Object.fromEntries(Object.entries(profile).reverse());
  assert.equal(profileHash(reordered), profileHash(profile));
  assert.equal(isStyleApproved({ profile: reordered, approved_at: "2026-10-22T00:00:00Z", approval_hash: profileHash(profile) }), true);
});

test("v1.87: detectEnding counts declarative endings (questions excluded) and styleSection adds a concrete ending rule", () => {
  const haeyo = ["솔직히 처음엔 귀찮았는데요, 한 번 해 두니까 편하더라고요. 방충제를 넣어 두면 좋아요. 여러분도 해 보세요!", "요즘 쌀쌀하죠? 문풍지를 붙이면 바람이 줄어요. 관리비가 조금 줄었답니다. 댓글로 남겨 주세요!"];
  assert.equal(detectEnding(haeyo), "haeyo");
  assert.equal(detectEnding(["준비가 필요합니다. 텐트를 고릅니다. 침낭도 챙깁니다. 무엇이 필요한가요?"]), "hamnida");
  assert.equal(detectEnding(["좋아요. 필요합니다."]), null);
  assert.equal(detectEnding([]), null);
  const profile = normalizeStyle(raw);
  assert.match(styleSection({ name: "내 블로그", profile, ending: "haeyo" }), /해요체입니다.*「~요」로 끝내고/);
  assert.match(styleSection({ name: "내 블로그", profile, ending: "hamnida" }), /합니다체입니다/);
  assert.doesNotMatch(styleSection({ name: "내 블로그", profile, ending: null }), /문장 끝맺음\(필수\)/);
});
