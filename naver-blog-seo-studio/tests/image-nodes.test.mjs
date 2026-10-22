import { test } from "node:test";
import assert from "node:assert/strict";
import { freeSlots, upsertNode, removeNode, placeNodeBlock, removeNodeBlock, cleanRequest, nodePrompt, isImageSlot } from "../lib/imageNodes.ts";

const text = (id, t) => ({ id, type: "text", text: t });
const img = (slot) => ({ id: slot, type: "image", slot, alt: "" });

test("BLC-10: freeSlots / upsertNode / removeNode change only the target node", () => {
  const a = { slot: "content-1", sentence: "가", path: "p1" };
  const b = { slot: "content-3", sentence: "다", path: "p3" };
  assert.deepEqual(freeSlots([a, b]), ["content-2"]);
  const replaced = upsertNode([a, b], { ...b, path: "p3-new" });
  assert.equal(replaced.find((n) => n.slot === "content-1"), a);
  assert.equal(replaced.find((n) => n.slot === "content-3").path, "p3-new");
  assert.deepEqual(upsertNode([b], a).map((n) => n.slot), ["content-1", "content-3"]);
  assert.deepEqual(removeNode([a, b], "content-1"), [b]);
  assert.ok(isImageSlot("content-2") && !isImageSlot("cover") && !isImageSlot("content-4"));
});

test("BLC-10: placeNodeBlock splits at the paragraph of the sentence and keeps existing positions", () => {
  const blocks = [img("cover"), text("text-1", "첫 문단입니다.\n\n둘째 문단에 텐트 이야기.\n\n셋째 문단."), img("content-1"), text("text-2", "마지막")];
  const placed = placeNodeBlock(blocks, { slot: "content-2", sentence: "둘째 문단에 텐트 이야기." });
  assert.deepEqual(placed.map((b) => b.id), ["cover", "text-1", "content-2", "text-5", "content-1", "text-2"]);
  assert.equal(placed[1].text, "첫 문단입니다.");
  assert.equal(placed[3].text, "둘째 문단에 텐트 이야기.\n\n셋째 문단.");
  // 이미 있는 노드는 위치 그대로
  assert.equal(placeNodeBlock(placed, { slot: "content-1", sentence: "마지막" }), placed);
  // 첫 문단이면 그 글 블록 앞
  assert.deepEqual(placeNodeBlock(blocks, { slot: "content-2", sentence: "첫 문단입니다." }).map((b) => b.id), ["cover", "content-2", "text-1", "content-1", "text-2"]);
  // 지정한 블록 앞
  assert.deepEqual(placeNodeBlock(blocks, { slot: "content-3", sentence: "x" }, "text-2").map((b) => b.id), ["cover", "text-1", "content-1", "content-3", "text-2"]);
  // 못 찾으면 그대로
  assert.equal(placeNodeBlock(blocks, { slot: "content-3", sentence: "없는 문장" }), blocks);
  assert.deepEqual(removeNodeBlock(placed, "content-1").map((b) => b.id), ["cover", "text-1", "content-2", "text-5", "text-2"]);
});

test("BLC-10: request is trimmed to 200 chars and appended to the stored scene", () => {
  assert.equal(cleanRequest("  사람 없이\n 소품만  "), "사람 없이 소품만");
  assert.equal(cleanRequest("가".repeat(300)).length, 200);
  assert.equal(cleanRequest(3), "");
  assert.equal(nodePrompt("scene", ""), "scene");
  assert.match(nodePrompt("scene", "소품만"), /^scene Additional request .*소품만$/);
});
