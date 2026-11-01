// 병합 B-4: 이미지 비율·표현 방식·참고 사진 — 값 검사·요청 구성(가짜 Gemini). 네트워크·AI 없음.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import * as opts from "../lib/imageOptions.ts";
const require = createRequire(import.meta.url);
const ts = require("typescript");
function moduleAt(path, mocks = {}) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { console })(name => name in mocks ? mocks[name] : require(name), module, module.exports);
  return module.exports;
}
let sent = null;
const nano = moduleAt("../lib/ai/nanoBanana.ts", {
  "server-only": {},
  "./nanoBananaConfig": { getNanoBananaConfig: () => ({ modelName: "fake-image", imageSize: "2K", temperature: 1 }) },
  "./geminiImage": { generateGeminiImage: async (req) => { sent = req; return { base64: "AAAA", mimeType: "image/png" }; } },
  "../imageOptions": opts,
});
const OLD = "Create one photorealistic editorial image for a Korean Naver blog post. Topic: 가을 캠핑. Title: 제목. Keywords: 캠핑. Depict realistic Korean/East Asian people by default unless the topic explicitly requires another setting. Use one unified scene, not a collage or split screen. Natural lighting, documentary-quality composition, 16:9 landscape, no visible text, no logo, no watermark.";

test("no options: the request is exactly the old one (16:9, same prompt, no parts)", async () => {
  await nano.generateNanoBananaImage({ apiKey: "k", topic: "가을 캠핑", title: "제목", keywords: "캠핑" });
  assert.equal(sent.prompt, OLD); assert.equal(sent.aspectRatio, "16:9"); assert.equal(sent.parts, undefined);
});

test("ratio and style change the request; refs go as parts with the reference rule", async () => {
  await nano.generateNanoBananaImage({ apiKey: "k", topic: "가을 캠핑", title: "제목", keywords: "캠핑", aspectRatio: "1:1", style: "card" });
  assert.equal(sent.aspectRatio, "1:1"); assert.match(sent.prompt, /1:1 square/); assert.match(sent.prompt, /information-card/); assert.match(sent.prompt, /no visible text/);
  await nano.generateNanoBananaImage({ apiKey: "k", topic: "가을 캠핑", aspectRatio: "4:3", refs: [{ mimeType: "image/jpeg", data: "QUJD" }] });
  assert.equal(sent.prompt, undefined); assert.equal(sent.parts.length, 2);
  assert.match(sent.parts[0].text, /Do not copy any person's face/); assert.deepEqual(sent.parts[1], { inlineData: { mimeType: "image/jpeg", data: "QUJD" } });
});

test("readers: unknown values fall back; refs are checked for count, type, size", () => {
  assert.equal(opts.readImageRatio("21:9"), "16:9"); assert.equal(opts.readImageRatio("3:4"), "3:4");
  assert.equal(opts.readImageStyle("oil"), "default"); assert.equal(opts.readImageStyle("place"), "place");
  assert.deepEqual(opts.readImageRefs(undefined), []);
  const one = { mimeType: "image/png", data: "QUJD" };
  assert.equal(opts.readImageRefs([one]).length, 1);
  assert.throws(() => opts.readImageRefs(Array(6).fill(one)), /5장/);
  assert.throws(() => opts.readImageRefs([{ mimeType: "image/gif", data: "QUJD" }]), opts.ImageRefError);
  assert.throws(() => opts.readImageRefs([{ mimeType: "image/png", data: "@@@" }]), opts.ImageRefError);
  assert.throws(() => opts.readImageRefs([{ mimeType: "image/png", data: "A".repeat(1_000_001) }]), /너무 큽니다/);
  assert.throws(() => opts.readImageRefs(Array(4).fill({ mimeType: "image/png", data: "A".repeat(900_000) })), /합쳐/);
});

test("non-photo styles drop the photorealistic wording; the default stays identical", async () => {
  await nano.generateNanoBananaImage({ apiKey: "k", topic: "가을 캠핑", title: "제목", keywords: "캠핑", style: "card" });
  assert.doesNotMatch(sent.prompt, /photorealistic|documentary-quality/); assert.match(sent.prompt, /flat-design information card/); assert.match(sent.prompt, /no visible text/);
  await nano.generateNanoBananaImage({ apiKey: "k", topic: "가을 캠핑", title: "제목", keywords: "캠핑", style: "phone" });
  assert.match(sent.prompt, /photorealistic editorial image/); assert.match(sent.prompt, /smartphone photo/);
  await nano.generateNanoBananaImage({ apiKey: "k", topic: "가을 캠핑", title: "제목", keywords: "캠핑" });
  assert.equal(sent.prompt, OLD);
});

// 작업실 병합(v2.22): 이미지 노드별 참고 사진
test("pickImageRefs: node photos win, common photos are not mixed in", () => {
  assert.deepEqual(opts.pickImageRefs(["n1"], ["c1", "c2"]), ["n1"]);
});
test("pickImageRefs: no node photos -> common photos (old behaviour)", () => {
  assert.deepEqual(opts.pickImageRefs(undefined, ["c1", "c2"]), ["c1", "c2"]);
  assert.deepEqual(opts.pickImageRefs([], ["c1"]), ["c1"]);
  assert.deepEqual(opts.pickImageRefs([], []), []);
});
test("pickImageRefs: never more than MAX_IMAGE_REFS", () => {
  const many = Array.from({ length: opts.MAX_IMAGE_REFS + 3 }, (_, i) => `n${i}`);
  assert.equal(opts.pickImageRefs(many, []).length, opts.MAX_IMAGE_REFS);
});

// 콘텐츠 제작 병합(블로그 ④, v2.22): 참고 사진 용도
const REF = [{ mimeType: "image/jpeg", data: "AAAA" }];
test("refParts: default and mood keep the old wording exactly", () => {
  assert.equal(opts.refParts("P", REF)[0].text, `P ${opts.REF_RULE}`);
  assert.equal(opts.refParts("P", REF, "mood")[0].text, `P ${opts.REF_RULE}`);
});
test("refParts: product mode uses the product rule (keep the product, no new text/logo)", () => {
  const text = opts.refParts("P", REF, "product")[0].text;
  assert.equal(text, `P ${opts.PRODUCT_REF_RULE}`);
  assert.match(opts.PRODUCT_REF_RULE, /preserving its shape/);
  assert.match(opts.PRODUCT_REF_RULE, /do not add any other text, logo or watermark/);
});
test("readImageRefMode: only 'product' switches, anything else is mood", () => {
  assert.equal(opts.readImageRefMode("product"), "product");
  for (const v of [undefined, null, "", "PRODUCT", "mood", 1]) assert.equal(opts.readImageRefMode(v), "mood");
});
test("nanoBanana: refMode reaches the request (product rule in parts)", async () => {
  sent = null;
  await nano.generateNanoBananaImage({ apiKey: "k", topic: "t", refs: REF, refMode: "product" });
  assert.ok(sent.parts[0].text.endsWith(opts.PRODUCT_REF_RULE));
});
