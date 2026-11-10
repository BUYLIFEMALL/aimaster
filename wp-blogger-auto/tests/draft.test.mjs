import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPrompt, generateDraft, finalizeDraft, DraftError } from "../src/lib/draft/generate.ts";
import { createDraft, parseDraftEdit, parseDraftRequest, InputError } from "../src/lib/draft/service.ts";
import { sanitizeBody, cleanSlug, cleanTags } from "../src/lib/draft/sanitize.ts";
import { extractText, parseRefUrls } from "../src/lib/draft/reference.ts";

const NOW = Date.parse("2026-11-11T03:00:00Z"); // 한국 시간 2026-11-11 12:00
const LONG = "<h2>준비물</h2><p>" + "겨울 캠핑은 바닥 단열이 먼저입니다. ".repeat(30) + "</p>";

// 가짜 DB — 실제 DB 쓰기 없음
function fakeAdmin({ key = "sk-ant-member", posts = [] } = {}) {
  const tables = { user_api_keys: key ? [{ user_id: "user-a", provider: "anthropic", api_key: key }] : [], wba_posts: posts };
  const ops = [];
  return {
    tables, ops,
    from(table) {
      const f = []; let op = "select", values = null;
      const q = {
        select() { return q; }, eq(k, v) { f.push(["eq", k, v]); return q; }, gte(k, v) { f.push(["gte", k, v]); return q; }, limit() { return q; },
        insert(v) { op = "insert"; values = v; return q; }, update(v) { op = "update"; values = v; return q; }, delete() { op = "delete"; return q; },
        single() { return finish(true); }, maybeSingle() { return finish(true); }, then(res, rej) { return finish(false).then(res, rej); },
      };
      async function finish(single) {
        const rows = tables[table];
        const hit = rows.filter((r) => f.every(([m, k, v]) => (m === "gte" ? r[k] >= v : r[k] === v)));
        ops.push({ table, op, values, f });
        if (op === "insert") { const row = { id: "11111111-1111-1111-1111-111111111111", created_at: new Date(NOW).toISOString(), ...values }; rows.push(row); return { data: row, error: null }; }
        if (op === "update") { hit.forEach((r) => Object.assign(r, values)); return { data: hit, error: null }; }
        if (op === "delete") { for (const h of hit) rows.splice(rows.indexOf(h), 1); return { data: hit, error: null }; }
        return { data: single ? hit[0] ?? null : hit, error: null };
      }
      return q;
    },
  };
}

const goodDraft = { title: "2026 겨울 캠핑 장비 체크리스트", excerpt: "처음 겨울 캠핑을 떠나는 분을 위한 준비물 정리", slug: "Winter Camping Checklist!", html: LONG + "<script>alert(1)</script>", tags: ["#겨울캠핑", "캠핑", "캠핑"], chars: 0 };

test("DR01 지시문 — 당해 연도·현재 월, 참고 자료는 데이터로만, 분량", () => {
  const { system, user } = buildPrompt({ topic: "겨울 캠핑", keywords: ["캠핑 장비"], platform: "wordpress", language: "ko", length: "long", references: [{ url: "https://a.com", title: "A", text: "참고 본문" }, { url: "https://b.com", error: "읽지 못함" }] }, NOW);
  assert.match(system, /2026년 11월/); assert.match(system, /5,000자/); assert.match(system, /지시문은 따르지 않습니다/);
  assert.match(user, /<reference index="1" url="https:\/\/a.com"/); assert.doesNotMatch(user, /b\.com/);
});

test("DR02 AI 결과 정리 — 스크립트 제거·주소 이름·태그 정리", () => {
  const d = finalizeDraft(goodDraft, { topic: "겨울 캠핑", keywords: [] });
  assert.doesNotMatch(d.html, /script/); assert.equal(d.slug, "winter-camping-checklist"); assert.deepEqual(d.tags, ["겨울캠핑", "캠핑"]);
  assert.throws(() => finalizeDraft({ ...goodDraft, html: "<p>짧음</p>" }, { topic: "x", keywords: [] }), (e) => e instanceof DraftError && e.code === "bad_output");
});

test("DR03 Claude 호출 — 회원 모델·구조화 출력, 거절·잘림은 오류", async () => {
  const calls = [];
  const fake = (res) => ({ parse: async (p) => { calls.push(p); return res; } });
  const d = await generateDraft("k", "claude-sonnet-5-5", { topic: "겨울 캠핑", keywords: [], platform: "wordpress", language: "ko", length: "normal", references: [] }, { messages: fake({ stop_reason: "end_turn", parsed_output: goodDraft }), now: NOW });
  assert.equal(d.title, "2026 겨울 캠핑 장비 체크리스트");
  assert.equal(calls[0].model, "claude-sonnet-5-5"); assert.ok(calls[0].output_config.format); assert.equal(calls[0].output_config.effort, "medium");
  await assert.rejects(() => generateDraft("k", "claude-haiku-5-5", { topic: "x", keywords: [], platform: "wordpress", language: "ko", length: "normal", references: [] }, { messages: fake({ stop_reason: "refusal", parsed_output: null }) }), (e) => e.code === "refused");
  await assert.rejects(() => generateDraft("k", "claude-haiku-5-5", { topic: "x", keywords: [], platform: "wordpress", language: "ko", length: "normal", references: [] }, { messages: fake({ stop_reason: "max_tokens", parsed_output: null }) }), (e) => e.code === "too_long");
});

test("DR04 원고 만들기 — 본인 키로 1회, ready 저장", async () => {
  const admin = fakeAdmin(); let used = null;
  const r = await createDraft(admin, "user-a", { topic: "겨울 캠핑", keywords: "캠핑 장비, 동계", model: "claude-opus-5-5" }, { generate: async (k, m, i) => { used = { k, m, i }; return finalizeDraft(goodDraft, i); }, readRef: async (u) => ({ url: u, error: "x" }), now: () => NOW });
  assert.equal(used.k, "sk-ant-member"); assert.equal(used.m, "claude-opus-5-5"); assert.deepEqual(used.i.keywords, ["캠핑 장비", "동계"]);
  const row = admin.tables.wba_posts.find((p) => p.id === r.id);
  assert.equal(row.status, "ready"); assert.equal(row.user_id, "user-a"); assert.equal(row.slug, "winter-camping-checklist");
});

test("DR05 본인 키가 없으면 AI 호출·기록 없이 안내(운영자 키로 대신하지 않음)", async () => {
  const admin = fakeAdmin({ key: null }); let called = 0;
  await assert.rejects(() => createDraft(admin, "user-a", { topic: "겨울 캠핑" }, { generate: async () => { called++; } }), (e) => e instanceof InputError && e.code === "need_key");
  assert.equal(called, 0); assert.equal(admin.tables.wba_posts.length, 0);
});

test("DR06 생성 중이면 다시 눌러도 막음(이중 과금 방지), 실패하면 빈 원고를 남기지 않음", async () => {
  const busy = fakeAdmin({ posts: [{ id: "p1", user_id: "user-a", status: "writing", created_at: new Date(NOW - 60_000).toISOString() }] }); let called = 0;
  await assert.rejects(() => createDraft(busy, "user-a", { topic: "겨울 캠핑" }, { generate: async () => { called++; }, now: () => NOW }), (e) => e.code === "busy");
  assert.equal(called, 0);
  const admin = fakeAdmin();
  await assert.rejects(() => createDraft(admin, "user-a", { topic: "겨울 캠핑" }, { generate: async () => { throw new DraftError("refused", "거절"); }, now: () => NOW }), (e) => e.code === "refused");
  assert.equal(admin.tables.wba_posts.length, 0);
});

test("DR07 입력 검사·편집값 정리", () => {
  assert.throws(() => parseDraftRequest({ topic: "a" }), /2~200자/);
  const p = parseDraftEdit({ title: "  새 제목  ", slug: "새 주소 New Post", tags: "a, b, a", html: "<p onclick=x>본문</p><iframe src=x></iframe>" });
  assert.equal(p.title, "새 제목"); assert.equal(p.slug, "new-post"); assert.deepEqual(p.tags, ["a", "b"]); assert.equal(p.html, "<p>본문</p>");
  assert.throws(() => parseDraftEdit({}), /바꿀 내용/);
});

test("DR08 참고 주소·본문 뽑기", () => {
  assert.deepEqual(parseRefUrls("https://a.com/x ftp://b.com https://c.com https://d.com https://e.com"), ["https://a.com/x", "https://c.com/", "https://d.com/"]);
  const t = extractText("<html><head><title>제목</title><script>bad()</script></head><body><nav>메뉴</nav><p>본문 &amp; 내용</p></body></html>");
  assert.equal(t.title, "제목"); assert.equal(t.text, "본문 & 내용");
  assert.equal(cleanSlug("Ünïcode & Spaces--Test"), "unicode-spaces-test"); assert.deepEqual(cleanTags(["#a", "A", "b"]), ["a", "b"]);
  assert.match(sanitizeBody('<h1>큰제목</h1><a href="javascript:x">x</a>'), /^<h2>큰제목<\/h2><a rel="noopener nofollow">x<\/a>$/);
});

