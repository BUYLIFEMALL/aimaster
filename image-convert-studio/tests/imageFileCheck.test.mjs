// 공용 기준 코드 `image-file-check` 테스트 — 기준: portrait-photo/tests/imageFileCheck.test.mjs (사본은 --sync로만 갱신)
import test from "node:test";
import assert from "node:assert/strict";
import { IMAGE_READ_FAIL_MESSAGE, checkImageFile, splitReadableImages } from "../src/lib/imageFileCheck.ts";

const blob = (name) => Object.assign(new Blob(["x"]), { name });
function withGlobals(g, fn) {
  const keys = ["createImageBitmap", "Image"];
  const saved = Object.fromEntries(keys.map((k) => [k, globalThis[k]]));
  const savedUrl = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  for (const k of keys) { if (k in g) globalThis[k] = g[k]; else delete globalThis[k]; }
  URL.createObjectURL = () => "blob:test"; URL.revokeObjectURL = () => {};
  return Promise.resolve(fn()).finally(() => {
    for (const k of keys) { if (saved[k] === undefined) delete globalThis[k]; else globalThis[k] = saved[k]; }
    URL.createObjectURL = savedUrl.create; URL.revokeObjectURL = savedUrl.revoke;
  });
}
// onload/onerror를 src 지정 직후 비동기로 부르는 가짜 Image
const fakeImage = (ok) => class { set src(_) { setTimeout(() => { if (ok) { this.naturalWidth = 30; this.naturalHeight = 40; this.onload(); } else this.onerror(); }); } };

test("사진 읽기: 정상 사진은 크기와 함께 통과", () => withGlobals({ createImageBitmap: async () => ({ width: 10, height: 20, close() {} }) }, async () => {
  assert.deepEqual(await checkImageFile(blob("a.jpg")), { ok: true, width: 10, height: 20, checked: true });
}));

test("사진 읽기: 첫 방식이 실패해도 Image로 풀리면 통과(정상 사진을 잘못 막지 않음)", () => withGlobals({ createImageBitmap: async () => { throw new Error("x"); }, Image: fakeImage(true) }, async () => {
  assert.deepEqual(await checkImageFile(blob("a.svg")), { ok: true, width: 30, height: 40, checked: true });
}));

test("사진 읽기: 둘 다 실패하면 한글 안내", () => withGlobals({ createImageBitmap: async () => { throw new Error("The source image could not be decoded."); }, Image: fakeImage(false) }, async () => {
  assert.deepEqual(await checkImageFile(blob("broken.jpg")), { ok: false, message: IMAGE_READ_FAIL_MESSAGE });
  assert.match(IMAGE_READ_FAIL_MESSAGE, /사진을 읽지 못했어요/);
}));

test("사진 읽기: 확인 수단이 없는 환경에서는 막지 않음", () => withGlobals({}, async () => {
  assert.deepEqual(await checkImageFile(blob("a.jpg")), { ok: true, width: 0, height: 0, checked: false });
}));

test("여러 장: 읽히는 사진만 순서대로 고름", () => withGlobals({ createImageBitmap: async (b) => { if (b.name.startsWith("bad")) throw new Error("x"); return { width: 1, height: 1 }; }, Image: fakeImage(false) }, async () => {
  const files = [blob("a.jpg"), blob("bad1.jpg"), blob("b.jpg")];
  const { readable, failed } = await splitReadableImages(files);
  assert.deepEqual(readable.map((f) => f.name), ["a.jpg", "b.jpg"]);
  assert.deepEqual(failed.map((f) => f.name), ["bad1.jpg"]);
}));
