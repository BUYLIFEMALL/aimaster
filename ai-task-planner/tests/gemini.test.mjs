import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { emptyWorkspace, localDate } from "../src/lib/planner/model.ts";
import { analysisData } from "../src/lib/planner/ai.ts";
await mkdir("test-artifacts", { recursive: true });
const result = await build({ entryPoints: ["src/lib/planner/gemini.ts"], bundle: true, write: false, format: "esm", platform: "node", plugins: [{ name: "test-server-only-marker", setup(b) { b.onResolve({ filter: /^server-only$/ }, () => ({ path: "server-only", namespace: "marker" })); b.onLoad({ filter: /.*/, namespace: "marker" }, () => ({ contents: "", loader: "js" })); } }] });
const file = path.resolve("test-artifacts/provider-test.mjs"); await writeFile(file, result.outputFiles[0].text);
const { analyzeWithGemini } = await import(pathToFileURL(file).href);
test("provider uses the selected model and key header once; incomplete JSON and upstream failures are sanitized", async () => {
  const original = globalThis.fetch, calls = [];
  const expected = { summary: "기록에 근거한 요약", strengths: ["작업 완료"], suggestions: Array.from({ length: 3 }, (_, i) => ({ action: `제안 ${i + 1}`, evidence: "완료 기록 1개" })) };
  const data = analysisData(emptyWorkspace(), { date: localDate(Date.now()), categoryId: "", query: "", revision: 0 }, Date.now());
  let status = 200, content = expected, finish = "STOP";
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return new Response(JSON.stringify(status === 200 ? { candidates: [{ finishReason: finish, content: { parts: [{ thought: true, text: "비공개 생각" }, { text: JSON.stringify(content) }] } }] } : { error: { message: "fixture-token-do-not-return" } }), { status, headers: { "content-type": "application/json" } }); };
  try {
    assert.deepEqual(await analyzeWithGemini("fixture-token-do-not-return", "gemini-3.8-flash", data), expected);
    assert.ok(calls[0].url.includes("gemini-3.8-flash:generateContent")); assert.equal(calls[0].url.includes("fixture-token"), false); assert.equal(calls[0].options.headers["x-goog-api-key"], "fixture-token-do-not-return");
    assert.equal(JSON.parse(calls[0].options.body).generationConfig.responseJsonSchema.properties.suggestions.minItems, 3);
    content = { summary: "필드 누락" }; await assert.rejects(() => analyzeWithGemini("fixture-token-do-not-return", "gemini-3.8-flash", data), e => e.status === 502);
    content = expected; finish = "MAX_TOKENS"; await assert.rejects(() => analyzeWithGemini("fixture-token-do-not-return", "gemini-3.8-flash", data), e => e.status === 502);
    for (const code of [400, 403, 404, 429, 500]) { status = code; await assert.rejects(() => analyzeWithGemini("fixture-token-do-not-return", "gemini-3.8-flash", data), e => !e.message.includes("fixture-token")); }
    assert.equal(calls.length, 8);
  } finally { globalThis.fetch = original; }
});
