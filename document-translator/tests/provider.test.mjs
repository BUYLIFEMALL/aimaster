import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { emptyState } from "../src/lib/translation/model.ts";
await mkdir("test-artifacts", { recursive: true });
await build({
  entryPoints: ["src/lib/translation/gemini.ts"],
  outfile: "test-artifacts/gemini.test.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  plugins: [
    {
      name: "test-server-boundaries",
      setup(b) {
        b.onResolve({ filter: /^server-only$/ }, () => ({
          path: "empty",
          namespace: "fixture",
        }));
        b.onResolve({ filter: /^\.\/api$/ }, () => ({
          path: "api",
          namespace: "fixture",
        }));
        b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({
          contents:
            a.path === "empty"
              ? ""
              : `export class AppError extends Error {constructor(message,status=400,needKey=false){super(message);this.status=status;this.needKey=needKey}}`,
          loader: "js",
        }));
      },
    },
  ],
});
const { generate, translationPrompt } = await import(
  pathToFileURL(path.resolve("test-artifacts/gemini.test.mjs")).href
);
test("provider uses only supplied own key and model, validates completion and schema, never retries or falls back", async () => {
  const request = {
    kind: "translate",
    options: emptyState().options,
    blocks: [{ id: "b1", text: "2020년 원문 API" }],
    sourceBlocks: [],
    glossary: [],
    context: "",
  };
  const valid = {
    blocks: [{ id: "b1", text: "Source API in 2020" }],
    sourceLanguage: "ko",
    detectedDomain: "IT",
    analysis: {
      context: [],
      terminology: [],
      style: { score: 8, formality: "격식", tone: "명확", feedback: "참고" },
    },
  };
  const original = globalThis.fetch;
  let calls = 0,
    mode = "ok";
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.ok(url.includes(request.options.model));
    assert.ok(!url.includes("member-key"));
    assert.equal(init.headers["x-goog-api-key"], "member-key");
    assert.equal(init.cache, "no-store");
    const sent = JSON.parse(init.body);
    assert.equal(sent.generationConfig.responseMimeType, "application/json");
    assert.ok(sent.generationConfig.responseJsonSchema.properties);
    assert.match(
      sent.contents[0].parts[0].text,
      new RegExp(`Current year: ${new Date().getFullYear()}`),
    );
    assert.match(sent.contents[0].parts[0].text, /2020/);
    if (mode === "429") return new Response("{}", { status: 429 });
    if (mode === "403") return new Response("{}", { status: 403 });
    if (mode === "network") throw new Error("secret provider detail");
    const result = structuredClone(valid);
    if (mode === "wrong-score") result.analysis.style.score = 11;
    if (mode === "wrong-id") result.blocks[0].id = "b2";
    return Response.json({
      candidates: [
        {
          finishReason: mode === "partial" ? "MAX_TOKENS" : "STOP",
          content: {
            parts: [
              { text: "internal thought", thought: true },
              {
                text: mode === "bad-json" ? "invalid" : JSON.stringify(result),
              },
            ],
          },
        },
      ],
    });
  };
  try {
    assert.equal(
      (await generate("member-key", request)).blocks[0].text,
      valid.blocks[0].text,
    );
    for (mode of [
      "429",
      "403",
      "network",
      "wrong-score",
      "wrong-id",
      "partial",
      "bad-json",
    ]) {
      const previous = calls;
      await assert.rejects(
        () => generate("member-key", request),
        (e) => !e.message.includes("secret") && e.status >= 400,
      );
      assert.equal(calls, previous + 1);
    }
    assert.match(
      translationPrompt({
        ...request,
        kind: "reverse",
        options: { ...request.options, sourceLanguage: "ko" },
      }),
      /CURRENT TRANSLATION/,
    );
    assert.match(
      translationPrompt({ ...request, kind: "review" }),
      /human-edited/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
