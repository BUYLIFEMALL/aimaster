import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { floorPrice, marginRate, checkSuggestion, estimateCost, buildQuotePrompt, SuggestionSchema, isAiModel } from "../src/lib/aiQuote.ts";
import { sealSecret, openSecret, looksLikeAnthropicKey } from "../src/lib/secretBox.ts";

const fact = (o = {}) => ({ item_id: "i1", name: "복사지", option: "", qty: 50, list_unit: 25000, customer_unit: 22000, cost: 18000, stock: 100, last: null, ...o });

test("D27 최저선 — 원가 ÷ (1 − 최소 마진), 원 단위 올림", () => {
  assert.equal(floorPrice(18000, 10), 20000);
  assert.equal(floorPrice(10001, 10), 11113);
  assert.equal(floorPrice(null, 10), null);
  assert.equal(marginRate(20000, 18000), 10);
});

test("D27 응답 검사 — 최저선 보정·비싼 제안 경고·빠진 품목·모르는 품목 무시", () => {
  const facts = [fact(), fact({ item_id: "i2", cost: null }), fact({ item_id: "i3" })];
  const rows = checkSuggestion(facts, { items: [
    { item_id: "i1", unit_price: 19000, reason: "대량 할인" },
    { item_id: "i2", unit_price: 23000, reason: "기준가" },
    { item_id: "zzz", unit_price: 1, reason: "모르는 품목" },
  ], note: "" }, 10);
  assert.equal(rows[0].final, 20000);
  assert.match(rows[0].warnings.join(), /최소 마진 10%/);
  assert.equal(rows[1].final, 23000);
  assert.match(rows[1].warnings.join(), /22,000원\)보다 비쌉니다/);
  assert.match(rows[1].warnings.join(), /원가가 없어/);
  assert.equal(rows[2].final, null);
  assert.equal(rows.length, 3);
});

test("D27 비용 계산 — 모델별 단가", () => {
  assert.deepEqual(estimateCost("claude-sonnet-5-5", { input_tokens: 3000, output_tokens: 1500 }), { usd: 0.021, krw: 29 });
  assert.equal(estimateCost("claude-haiku-5-5", { input_tokens: 3000, output_tokens: 1500 }).krw, 1);
  assert.ok(isAiModel("claude-opus-5-5") && !isAiModel("gpt-9"));
});

test("D27 보낼 글 — 기준 연도·마진 규칙·품목 줄, 연락처·주소 없음", () => {
  const p = buildQuotePrompt([fact({ last: { price: 21000, date: "2026-10-01" } })], { buyer: "시험상회", isBusiness: true, requestNote: "급해요", minMargin: 12, year: 2026 });
  assert.match(p.system, /2026년/);
  assert.match(p.system, /12% 이상/);
  assert.match(p.user, /"item_id":"i1"/);
  assert.match(p.user, /2026-10-01 21000원/);
  assert.doesNotMatch(p.user, /010-|주소/);
});

test("D27 응답 형식(zod) — 정수 단가만", () => {
  assert.ok(SuggestionSchema.safeParse({ items: [{ item_id: "a", unit_price: 100, reason: "x" }], note: "" }).success);
  assert.ok(!SuggestionSchema.safeParse({ items: [{ item_id: "a", unit_price: 100.5, reason: "x" }], note: "" }).success);
});

test("D27 키 암호화 — 왕복·다른 몰 id로는 안 풀림·열쇠 없으면 오류", () => {
  const secret = randomBytes(32).toString("base64");
  const sealed = sealSecret("sk-ant-api03-abcdefghijklmnopqrstuvwxyz", "store-A", secret);
  assert.match(sealed, /^v1:[A-Za-z0-9+/=]+$/);
  assert.equal(openSecret(sealed, "store-A", secret), "sk-ant-api03-abcdefghijklmnopqrstuvwxyz");
  assert.throws(() => openSecret(sealed, "store-B", secret), /풀지 못했습니다/);
  assert.throws(() => openSecret(sealed, "store-A", randomBytes(32).toString("base64")), /풀지 못했습니다/);
  assert.throws(() => sealSecret("x", "a", ""), /MALL_SECRET_KEY/);
  assert.ok(looksLikeAnthropicKey("sk-ant-api03-abcdefghijklmnopqrstuvwxyz") && !looksLikeAnthropicKey("abc"));
});

test("이유 글 끝에 남은 괄호·따옴표 기호를 지운다", () => {
  const [row] = checkSuggestion([fact()], { items: [{ item_id: "i1", unit_price: 21000, reason: "소폭 인하.}" }], note: "" }, 10);
  assert.equal(row.reason, "소폭 인하.");
});

test("AI 제공자·모델 선택(2026-11-12) — 순서 OpenAI → Claude → Gemini, 제공자별 기본 모델, 짝 바로잡기", async () => {
  const q = await import("../src/lib/aiQuote.ts");
  assert.deepEqual(q.AI_PROVIDERS.map((p) => p.id), ["openai", "anthropic", "gemini"]);
  assert.equal(q.DEFAULT_AI_PROVIDER, "anthropic");
  assert.equal(q.DEFAULT_AI_MODEL, "claude-sonnet-5-5");
  for (const p of q.AI_PROVIDERS) {
    assert.ok(q.modelsOf(p.id).length >= 3, `${p.id} 모델 3개 이상`);
    assert.equal(q.providerOf(q.defaultModelOf(p.id)), p.id);
  }
  assert.equal(q.AI_MODELS.length, 10);
  assert.equal(q.pickModel("gemini", "claude-opus-5-5"), "gemini-3.8-flash"); // 다른 제공자 모델이면 기본으로
  assert.equal(q.pickModel("openai", "gpt-6-astra"), "gpt-6-astra");
  assert.equal(q.pickModel("openai", "gpt-9"), "gpt-6.1-terra");
  assert.ok(q.isAiProvider("gemini") && !q.isAiProvider("claude"));
  assert.equal(q.estimateCost("gpt-6-luna", { input_tokens: 3000, output_tokens: 1500 }).krw, 1);
  assert.equal(q.estimateCost("모르는 모델", { input_tokens: 3000, output_tokens: 1500 }).usd, 0.021); // 모르면 기본(Sonnet) 단가
});

test("응답 형식(zod) → 제공자에 보낼 JSON 스키마", async () => {
  const { z } = await import("zod");
  const js = z.toJSONSchema(SuggestionSchema);
  assert.equal(js.type, "object");
  assert.ok(js.properties.items && js.properties.note);
  assert.deepEqual([...js.required].sort(), ["items", "note"]);
});

test("DB 0059 허용 모델 목록 = 코드 모델 목록", async () => {
  const { readFileSync } = await import("node:fs");
  const q = await import("../src/lib/aiQuote.ts");
  const sql = readFileSync(new URL("../supabase/migrations/0059_ai_multi_provider.sql", import.meta.url), "utf8");
  const block = sql.slice(sql.indexOf("mall_builder_secrets_ai_model_v2 check"), sql.indexOf("));", sql.indexOf("mall_builder_secrets_ai_model_v2 check")));
  const inSql = [...block.matchAll(/'([a-z0-9.-]+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(inSql, q.AI_MODELS.map((m) => m.id).sort());
});
