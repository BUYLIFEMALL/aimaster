// 임장 노트 위치 계산(2026-11-01)
import { test } from "node:test";
import assert from "node:assert/strict";
import { bestSample, exifGps, fitSize, locateDong, sggCandidates, shouldStopWaiting } from "../src/lib/onsite/geo.ts";

const square = (x, y, size = 1) => [[x, y], [x + size, y], [x + size, y + size], [x, y + size], [x, y]];
const boundaries = [
  ["가동", [[square(0, 0)]]],
  ["나동", [[square(1, 0)]]],
  ["구멍동", [[square(10, 10, 4), square(11, 11, 2)]]],
];

test("행정동: 경계 안이면 그 동, 밖이나 구멍 안이면 없음", () => {
  assert.equal(locateDong(boundaries, 0.5, 0.5), "가동");
  assert.equal(locateDong(boundaries, 0.5, 1.5), "나동");
  assert.equal(locateDong(boundaries, 5, 5), null);
  assert.equal(locateDong(boundaries, 12, 12), null);
  assert.equal(locateDong(boundaries, 10.5, 10.5), "구멍동");
});

test("시·군·구 후보: 범위 안의 곳만", () => {
  const index = [["11680", 127, 37, 127.1, 37.6], ["41285", 126.7, 37.6, 126.9, 37.8]];
  assert.deepEqual(sggCandidates(index, 37.5, 127.05), ["11680"]);
  assert.deepEqual(sggCandidates(index, 35, 129), []);
});

test("위치 대기: 오차가 충분히 작거나 20초가 지나면 멈추고, 가장 정확한 값을 쓴다", () => {
  const first = { lat: 1, lon: 1, accuracy: 100 };
  const good = { lat: 2, lon: 2, accuracy: 16 };
  assert.equal(shouldStopWaiting([], 1000), false);
  assert.equal(shouldStopWaiting([first], 1000), false);
  assert.equal(shouldStopWaiting([first, good], 1000), true);
  assert.equal(shouldStopWaiting([], 20000), true);
  assert.deepEqual(bestSample([first, good]), good);
  assert.equal(bestSample([]), null);
});

test("사진 크기: 긴 변 1600px로 줄이고 작은 사진은 그대로", () => {
  assert.deepEqual(fitSize(4000, 3000), { width: 1600, height: 1200 });
  assert.deepEqual(fitSize(800, 600), { width: 800, height: 600 });
});

function jpegWithGps() {
  const tiffLen = 200;
  const buf = new ArrayBuffer(10 + tiffLen);
  const bytes = new Uint8Array(buf);
  bytes.set([0xff, 0xd8, 0xff, 0xe1], 0);
  bytes.set([0x45, 0x78, 0x69, 0x66, 0, 0], 4);
  const o = 10;
  const v = new DataView(buf);
  v.setUint16(o, 0x4949);
  v.setUint32(o + 4, 8, true);
  v.setUint16(o + 8, 1, true);
  v.setUint16(o + 10, 0x8825, true);
  v.setUint32(o + 18, 26, true);
  const gps = o + 26;
  v.setUint16(gps, 2, true);
  const rational = (entry, tag, at, d, m, s) => {
    v.setUint16(entry, tag, true);
    v.setUint32(entry + 8, at, true);
    [d, m, s].forEach((n, i) => {
      v.setUint32(o + at + i * 8, n, true);
      v.setUint32(o + at + i * 8 + 4, 1, true);
    });
  };
  rational(gps + 2, 2, 60, 37, 30, 0);
  rational(gps + 14, 4, 90, 127, 0, 36);
  return buf;
}

test("사진 속 위치: 있으면 읽고 없으면 없음", () => {
  const gps = exifGps(jpegWithGps());
  assert.equal(gps.lat, 37.5);
  assert.equal(gps.lon, 127.01);
  assert.equal(exifGps(new ArrayBuffer(50)), null);
});
