import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  splitDocument,
  groupBlocks,
  combineBlocks,
  glossaryCsv,
  documentChecks,
  fingerprint,
} from "../src/lib/translation/document.ts";
import {
  emptyState,
  requestSchema,
  translatedSchema,
} from "../src/lib/translation/model.ts";
test("chunking preserves paragraph separators and Unicode without exceeding provider input limits", () => {
  for (const text of [
    "# 안내\n첫째 문단\n\n둘째 문단\n\n끝",
    "🙂한글 ".repeat(3000),
    "가".repeat(20_000),
    "\n\n첫 문단\n\n",
  ]) {
    const blocks = splitDocument(text);
    assert.equal(combineBlocks(blocks, blocks), text);
    const chunks = groupBlocks(blocks);
    assert.ok(chunks.length <= 10);
    assert.ok(
      chunks.every(
        (c) => c.reduce((n, b) => n + Array.from(b.text).length, 0) <= 4000,
      ),
    );
  }
  assert.throws(() => splitDocument("가".repeat(20001)));
  assert.throws(() => splitDocument("   "));
});
test("block coverage rejects duplicates or missing paragraphs; number and URL checks are suggestions", () => {
  const blocks = splitDocument("A\n\nB");
  assert.throws(() => combineBlocks(blocks, [{ id: "b1", text: "a" }]));
  assert.throws(() =>
    combineBlocks(blocks, [
      { id: "b1", text: "a" },
      { id: "b1", text: "b" },
    ]),
  );
  assert.deepEqual(
    documentChecks(
      "2026년 10월 20일 https://example.com",
      "2026/10/21 https://example.com",
    ),
    { missingUrls: [], changedNumbers: ["20"] },
  );
});
test("CSV protects formulas, preserves Unicode, quotes multiline fields and includes UTF-8 BOM", () => {
  const csv = glossaryCsv([
    { sourceTerm: " =1+1", targetTerm: "한글, 표현", note: '"인용"\n두 줄' },
  ]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"\' =1+1"'));
  assert.ok(csv.includes('"한글, 표현"'));
  assert.ok(csv.includes('""인용""\n두 줄'));
  assert.ok(csv.includes("\r\n"));
});
test("request rejects client ownership, arbitrary models and duplicate block IDs; hashes distinguish settings", async () => {
  const request = {
    operationId: randomUUID(),
    kind: "translate",
    options: emptyState().options,
    blocks: [{ id: "b1", text: "원문" }],
  };
  assert.equal(requestSchema.parse(request).blocks[0].text, "원문");
  assert.equal(
    requestSchema.safeParse({ ...request, userId: randomUUID() }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({
      ...request,
      options: { ...request.options, model: "unknown" },
    }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({
      ...request,
      blocks: [...request.blocks, ...request.blocks],
    }).success,
    false,
  );
  assert.equal(translatedSchema.safeParse({ blocks: [] }).success, false);
  assert.notEqual(await fingerprint("원문|en"), await fingerprint("원문|ja"));
});
