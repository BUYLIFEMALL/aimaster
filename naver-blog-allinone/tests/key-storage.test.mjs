// 2026-11-01(블로그 병합 결정 4번): API 키는 브라우저에 저장하지 않고 회원 본인 계정(user_api_keys)을 원본으로 쓴다.
import test from "node:test";
import assert from "node:assert/strict";

const store = new Map();
globalThis.window = {};
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
const s = await import("../src/lib/storage.ts");
const MAIN = "naver_blog_allinone_settings";
const LEGACY = "naver_blog_allinone_legacy_keys";

test("saveStoredSettings never writes API keys to the browser", () => {
  store.clear();
  s.saveStoredSettings({ ...s.DEFAULT_SETTINGS, geminiApiKey: "AIzaX", openaiApiKey: "sk-1", anthropicApiKey: "a", replicateApiKey: "r", textProvider: "openai" });
  const saved = JSON.parse(store.get(MAIN));
  assert.equal(saved.geminiApiKey, "");
  assert.equal(saved.openaiApiKey, "");
  assert.equal(saved.anthropicApiKey, "");
  assert.equal(saved.replicateApiKey, "");
  assert.equal(saved.textProvider, "openai");
});

test("old browser keys move to the legacy slot once and leave the settings", () => {
  store.clear();
  store.set(MAIN, JSON.stringify({ geminiApiKey: "AIzaOld", openaiApiKey: "", textModel: "gemini-flash-lite-latest" }));
  const got = s.getStoredSettings();
  assert.equal(got.geminiApiKey, "");
  assert.equal(got.textModel, "gemini-flash-lite-latest");
  assert.equal(JSON.parse(store.get(MAIN)).geminiApiKey, "");
  assert.deepEqual(s.getLegacyKeys(), { gemini: "AIzaOld" });
  s.getStoredSettings(); // 두 번 읽어도 그대로
  assert.deepEqual(s.getLegacyKeys(), { gemini: "AIzaOld" });
  s.clearLegacyKeys();
  assert.equal(store.has(LEGACY), false);
});

test("legacyKeysToMove: only keys the account does not have yet", () => {
  assert.deepEqual(s.legacyKeysToMove({ gemini: "A", openai: "B" }, { gemini: "server" }), ["openai"]);
  assert.deepEqual(s.legacyKeysToMove({ gemini: " " }, {}), []);
  assert.deepEqual(s.legacyKeysToMove({}, { gemini: "x" }), []);
});

test("withAccountKeys fills keys in memory and blanks missing providers", () => {
  const next = s.withAccountKeys({ ...s.DEFAULT_SETTINGS, openaiApiKey: "stale" }, { gemini: " AIzaS ", anthropic: null });
  assert.equal(next.geminiApiKey, "AIzaS");
  assert.equal(next.openaiApiKey, "");
  assert.equal(next.anthropicApiKey, "");
  assert.equal(next.replicateApiKey, "");
});
