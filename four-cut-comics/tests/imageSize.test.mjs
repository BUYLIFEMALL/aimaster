// v1.29 완성작 크기 기록·형식 바꾸기 규격 — 무료 시험
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { jpegSize, convertPresetFor } from "../src/lib/comic/imageSize.ts";

// SOI + APP0(16바이트) + SOF0(가로 1080, 세로 1350)
const fakeJpeg = (w, h) => new Uint8Array([
  0xff, 0xd8,
  0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  0xff, 0xc4, 0x00, 0x04, 0x00, 0x00,
  0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
  0xff, 0xd9,
]);

test("JPEG 머리 정보에서 가로·세로를 읽는다(DHT는 건너뜀)", () => {
  assert.deepEqual(jpegSize(fakeJpeg(1080, 1350)), { width: 1080, height: 1350 });
  assert.deepEqual(jpegSize(fakeJpeg(2048, 2048)), { width: 2048, height: 2048 });
  assert.equal(jpegSize(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), null);
  assert.equal(jpegSize(new Uint8Array([0xff, 0xd8, 0xff])), null);
});

test("실제 비율에 맞는 규격만(±3%), 없으면 빈 문자열", () => {
  assert.equal(convertPresetFor(1080, 1080), "insta-feed");
  assert.equal(convertPresetFor(2000, 2010), "insta-feed");
  assert.equal(convertPresetFor(1080, 1350), "insta-portrait");
  assert.equal(convertPresetFor(1080, 1920), "story");
  assert.equal(convertPresetFor(1920, 1080), "youtube-thumb");
  assert.equal(convertPresetFor(1000, 3000), "");
  assert.equal(convertPresetFor(undefined, 100), "");
});

test("저장할 때 크기를 기록하고, 형식 바꾸기 링크에 규격을 붙인다", () => {
  assert.match(readFileSync(new URL("../src/lib/saved.ts", import.meta.url), "utf8"), /\.\.\.\(jpegSize\(buf\) \?\? \{\}\)/);
  assert.match(readFileSync(new URL("../src/components/studio/ServerWorks.tsx", import.meta.url), "utf8"), /convertPresetFor\(w\.width, w\.height\)/);
});
