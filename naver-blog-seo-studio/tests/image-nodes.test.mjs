import { test } from "node:test";
import assert from "node:assert/strict";
import { freeSlots, upsertNode, removeNode, placeNodeBlock, removeNodeBlock, cleanRequest, nodePrompt, isImageSlot, splitParagraphBlocks, reflowBlocks } from "../lib/imageNodes.ts";

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

test("v2.00: splitParagraphBlocks makes one text block per paragraph with unique ids", () => {
  const split = splitParagraphBlocks([img("cover"), text("text-1", "가\n\n나\n \n다"), img("content-1"), text("text-2", "라")]);
  assert.deepEqual(split.map((b) => b.id), ["cover", "text-1", "text-3", "text-4", "content-1", "text-2"]);
  assert.deepEqual(split.filter((b) => b.type === "text").map((b) => b.text), ["가", "나", "다", "라"]);
  const once = splitParagraphBlocks(split);
  assert.deepEqual(once.map((b) => b.id), split.map((b) => b.id));
});

test("v2.00: reflowBlocks keeps each image before the same following paragraph after a whole-body edit, never drops one", () => {
  const blocks = [img("cover"), text("t1", "도입 문단입니다. 캠핑을 시작해 봅시다."), img("content-1"), text("t2", "텐트를 고르는 기준은 무게와 크기입니다."), text("t3", "침낭은 보온이 중요합니다."), img("content-2"), text("t4", "마지막 정리 문단입니다.")];
  const newBody = "도입 문단을 고쳤습니다.\n\n새로 넣은 문단입니다.\n\n텐트를 고르는 기준은 무게와 크기입니다.\n\n침낭은 보온이 중요합니다.\n\n마지막 정리 문단입니다. 한 줄 더.";
  const out = reflowBlocks(blocks, newBody, []);
  const shape = out.map((b) => b.type === "image" ? `[${b.slot}]` : b.text.slice(0, 4));
  // content-1은 「텐트를…」 앞(정확히 일치), content-2는 「마지막 정리…」 앞(앞 30자 일치), 대표 이미지는 첫 문단 앞(순서 자리)
  assert.deepEqual(shape, ["[cover]", "도입 문", "새로 넣", "[content-1]", "텐트를 ", "침낭은 ", "[content-2]", "마지막 "]);
  // 뒤 문단이 사라지면 기준 문장, 그것도 없으면 예전 순서 자리 — 빼지 않는다
  const gone = reflowBlocks(blocks, "완전히 다른 첫 문단입니다.\n\n완전히 다른 둘째 문단입니다.", [{ slot: "content-1", sentence: "둘째 문단" }]);
  assert.equal(gone.filter((b) => b.type === "image").length, 3);
  assert.deepEqual(gone.map((b) => b.type === "image" ? `[${b.slot}]` : "t"), ["[cover]", "t", "[content-1]", "t", "[content-2]"]);
});
