// 공용 기준 코드 `browser-free-erase` 순수 함수 시험 — 계산 모델은 브라우저에서만 돌므로 여기서는 자르기·마스크·상자 계산만 본다
import test from "node:test";
import assert from "node:assert/strict";
import {
  FREE_ERASE_CACHE, FREE_ERASE_MODELS, binarizeMask, detInputSize, dilateMask, fillBoxes, freeEraseErrorText, maskBounds, maskClusters, splitBox, probToBoxes, scaleBoxes, workRegion,
} from "../src/lib/freeErase/protocol.ts";

test("모델 주소는 커밋 고정·Apache-2.0, 캐시 이름에 커밋이 들어간다", () => {
  assert.match(FREE_ERASE_MODELS.lama.url, /\/resolve\/[0-9a-f]{40}\/lama_fp32\.onnx$/);
  assert.match(FREE_ERASE_MODELS.det.url, /\/resolve\/[0-9a-f]{40}\/PP-OCRv4\/ch_PP-OCRv4_det_infer\.onnx$/);
  assert.match(FREE_ERASE_MODELS.lama.license, /Apache-2\.0/);
  assert.match(FREE_ERASE_CACHE, /^free-erase-[0-9a-f]{7}-[0-9a-f]{7}$/);
});

test("마스크는 0보다 크면 지울 곳(흐린 가장자리 포함) — 127 기준이면 테두리가 남는다(§7 ③-1)", () => {
  const rgba = new Uint8ClampedArray([0, 0, 0, 0, 1, 1, 1, 1, 127, 127, 127, 127, 255, 255, 255, 255]);
  assert.deepEqual([...binarizeMask(rgba, 4, 0)], [0, 1, 1, 1]);
  assert.deepEqual([...binarizeMask(rgba, 4, 3)], [0, 1, 1, 1]);
});

test("넓히기는 r칸까지 정사각 이웃으로 퍼지고 그림 밖으로 넘치지 않는다", () => {
  const w = 7, h = 7, m = new Uint8Array(w * h); m[3 * w + 3] = 1;
  const d = dilateMask(m, w, h, 2);
  assert.equal(d.reduce((a, b) => a + b, 0), 25);
  assert.equal(d[1 * w + 1], 1); assert.equal(d[0 * w + 0], 0);
  const edge = new Uint8Array(w * h); edge[0] = 1;
  assert.equal(dilateMask(edge, w, h, 1).reduce((a, b) => a + b, 0), 4);
  assert.deepEqual([...dilateMask(m, w, h, 0)], [...m]);
});

test("마스크 범위와 작업 영역(주변 여유·그림 안·정사각형에 가깝게)", () => {
  const w = 1000, h = 600, m = new Uint8Array(w * h);
  for (let y = 100; y < 150; y++) for (let x = 400; x < 500; x++) m[y * w + x] = 1;
  const b = maskBounds(m, w, h);
  assert.deepEqual(b, { x: 400, y: 100, w: 100, h: 50 });
  assert.equal(maskBounds(new Uint8Array(4), 2, 2), null);
  const r = workRegion(b, w, h);
  assert.equal(r.w, 160); assert.equal(r.h, 160);
  assert.ok(r.x <= 400 && r.x + r.w >= 500 && r.y <= 100 && r.y + r.h >= 150);
  const corner = workRegion({ x: 0, y: 0, w: 10, h: 10 }, w, h);
  assert.deepEqual([corner.x, corner.y], [0, 0]);
  const big = workRegion({ x: 0, y: 0, w: 1000, h: 600 }, w, h);
  assert.deepEqual(big, { x: 0, y: 0, w: 1000, h: 600 });
});

test("글자 찾기 입력은 긴 변 960 이하·32의 배수", () => {
  assert.deepEqual(detInputSize(768, 512), { width: 768, height: 512 });
  const s = detInputSize(3000, 1000);
  assert.ok(s.width <= 960 && s.width % 32 === 0 && s.height % 32 === 0);
  assert.deepEqual(detInputSize(10, 10), { width: 32, height: 32 });
});

test("확률맵 → 덩어리별 상자, 작은 점은 버림 → 원본 좌표로 늘리고 둘레를 넓힘", () => {
  const w = 40, h = 20, p = new Float32Array(w * h);
  for (let y = 2; y < 8; y++) for (let x = 3; x < 20; x++) p[y * w + x] = 0.9;
  for (let y = 12; y < 16; y++) for (let x = 25; x < 35; x++) p[y * w + x] = 0.8;
  p[19 * w + 0] = 0.9;
  const boxes = probToBoxes(p, w, h);
  assert.equal(boxes.length, 2);
  assert.deepEqual(boxes[0], { x: 3, y: 2, w: 17, h: 6 });
  const big = scaleBoxes(boxes, w, h, 400, 200);
  assert.ok(big[0].x < 30 && big[0].y < 20 && big[0].x + big[0].w > 200);
  assert.ok(big.every((b) => b.x >= 0 && b.y >= 0 && b.x + b.w <= 400 && b.y + b.h <= 200));
});

test("상자 칠하기는 그림 밖을 자른다", () => {
  const w = 5, h = 4, m = new Uint8Array(w * h);
  fillBoxes(m, w, h, [{ x: 3, y: 2, w: 10, h: 10 }, { x: -2, y: -2, w: 3, h: 3 }]);
  assert.equal(m.reduce((a, b) => a + b, 0), 4 + 1);
});

test("오류 안내는 한국어이고 다른 방법(AI로 다시 그리기)을 알려 준다", () => {
  assert.match(freeEraseErrorText("download:503"), /인터넷/);
  assert.match(freeEraseErrorText("RangeError: Array buffer allocation failed"), /메모리/);
  assert.match(freeEraseErrorText("x"), /AI로 다시 그리기/);
});

test("떨어진 칠한 곳은 덩어리마다 따로(해상도 손실 줄이기), 가까운 곳은 하나로", () => {
  const w = 600, h = 400, m = new Uint8Array(w * h);
  const paint = (x0, y0, x1, y1) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[y * w + x] = 1; };
  paint(10, 10, 100, 40); paint(110, 15, 150, 35); paint(400, 300, 590, 390);
  const c = maskClusters(m, w, h, 24);
  assert.equal(c.length, 2);
  assert.ok(c[0].x <= 10 && c[0].x + c[0].w >= 150 && c[0].y <= 10);
  assert.ok(c[1].x <= 400 && c[1].x + c[1].w <= w && c[1].y + c[1].h <= h);
  assert.equal(maskClusters(new Uint8Array(w * h), w, h).length, 0);
});

test("긴 덩어리는 384px 이하 조각으로 나눠 작업 영역이 그림 전체가 되지 않게(큰 제목 잔상 방지)", () => {
  const pieces = splitBox({ x: 60, y: 270, w: 1150, h: 90 });
  assert.equal(pieces.length, 3);
  assert.ok(pieces.every((p) => p.w <= 384 && p.h === 90));
  assert.equal(pieces[0].x, 60); assert.equal(pieces.at(-1).x + pieces.at(-1).w, 1210);
  assert.deepEqual(splitBox({ x: 0, y: 0, w: 100, h: 50 }), [{ x: 0, y: 0, w: 100, h: 50 }]);
  const w = 1792, h = 2400, m = new Uint8Array(w * h);
  for (let y = 270; y < 360; y++) for (let x = 60; x < 1210; x++) m[y * w + x] = 1;
  for (let y = 400; y < 490; y++) for (let x = 60; x < 1000; x++) m[y * w + x] = 1;
  const c = maskClusters(m, w, h);
  assert.ok(c.length >= 6, "두 줄이 따로, 각 줄이 여러 조각으로");
  for (const b of c) { const r = workRegion(b, w, h); assert.ok(Math.max(r.w, r.h) <= 640, "작업 영역이 512에 가깝다"); }
});

import { PIECE_OVERLAP, clipToPiece, markDone } from "../src/lib/freeErase/protocol.ts";

test("회색 얼룩 방지: 조각 결과는 그 조각(+겹침) 안에만 붙인다", () => {
  const r = { x: 0, y: 0, w: 100, h: 20 }, m = new Uint8Array(100 * 20).fill(1);
  const piece = { x: 40, y: 0, w: 20, h: 20 };
  const c = clipToPiece(m, r, piece);
  const on = []; for (let x = 0; x < 100; x++) if (c[5 * 100 + x]) on.push(x);
  assert.equal(on[0], 40 - PIECE_OVERLAP);
  assert.equal(on.at(-1), 60 + PIECE_OVERLAP - 1);
  assert.equal(c.reduce((s, v) => s + v, 0), (20 + PIECE_OVERLAP * 2) * 20);
});

test("회색 얼룩 방지: 긴 줄을 조각마다 차례로 붙이면 칠한 곳이 모두 붙고, 남은 지울 곳은 0이 된다", () => {
  const w = 1300, h = 400, mask = new Uint8Array(w * h);
  for (let y = 270; y < 360; y++) for (let x = 60; x < 1210; x++) mask[y * w + x] = 1;
  const remaining = mask.slice(), pasted = new Uint8Array(w * h);
  const pieces = maskClusters(mask, w, h);
  assert.ok(pieces.length >= 3);
  for (const b of pieces) {
    const r = workRegion(b, w, h);
    const local = new Uint8Array(r.w * r.h);
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) local[y * r.w + x] = remaining[(r.y + y) * w + r.x + x];
    const clip = clipToPiece(local, r, b);
    // 앞 조각이 이미 채운 자리는 다시 붙이지 않는다
    for (let i = 0; i < clip.length; i++) if (clip[i]) { const y = (i / r.w) | 0, x = i % r.w; pasted[(r.y + y) * w + r.x + x] += 1; }
    markDone(remaining, w, clip, r);
  }
  let missing = 0, twice = 0;
  for (let i = 0; i < mask.length; i++) { if (mask[i] && !pasted[i]) missing++; if (pasted[i] > 1) twice++; }
  assert.equal(missing, 0, "빠진 자리 없음");
  assert.equal(twice, 0, "같은 자리를 두 번 덮지 않음");
  assert.equal(remaining.reduce((s, v) => s + v, 0), 0);
});
