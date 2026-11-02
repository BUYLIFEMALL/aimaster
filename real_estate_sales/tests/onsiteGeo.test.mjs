// 임장 노트 위치 계산(2026-11-01)
import { test } from "node:test";
import assert from "node:assert/strict";
import { autoParcel, bestSample, distanceM, exifGps, fitSize, formatAddress, formatJibun, locateDong, nearestAddress, sggCandidates, shouldStopWaiting, tileKey, tilesFor, utmkToWgs } from "../src/lib/onsite/geo.ts";

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

test("주소: 위치정보요약DB 좌표(UTM-K)를 위경도로 바꾼다", () => {
  const [lat, lon] = utmkToWgs(953241.683263, 1954023.466812); // 종로구 청운동 자하문로 94(파일 첫 줄)
  assert.ok(Math.abs(lat - 37.584415) < 1e-5 && Math.abs(lon - 126.970406) < 1e-5);
  assert.ok(distanceM(37.5, 127, 37.5009, 127) > 99 && distanceM(37.5, 127, 37.5009, 127) < 101);
});

test("주소: 격자는 가장자리 가까우면 옆 칸까지 본다", () => {
  assert.equal(tileKey(37.584, 126.970), "3758_12697");
  assert.deepEqual(tilesFor(37.585, 126.975), ["3758_12697"]);
  assert.equal(tilesFor(37.5801, 126.9701).length, 4, "모서리면 4칸");
});

test("주소: 가장 가까운 건물을 도로명주소로, 150m 밖이면 없음", () => {
  const row = (lat, lon, main, sub = "0", building = "", under = "0") => [Math.round(lat * 1e5), Math.round(lon * 1e5), "서울특별시", "종로구", "청운동", "자하문로", under, main, sub, building, "주택", "청운효자동"];
  assert.equal(formatAddress(row(0, 0, "96", "0", "평안빌")), "서울특별시 종로구 자하문로 96 (청운동, 평안빌)");
  assert.equal(formatAddress(row(0, 0, "12", "3", "", "1")), "서울특별시 종로구 자하문로 지하 12-3 (청운동)");
  const rows = [row(37.5844, 126.9704, "94"), row(37.5846, 126.9704, "96")];
  const hit = nearestAddress(rows, 37.58442, 126.9704);
  assert.equal(hit.address, "서울특별시 종로구 자하문로 94 (청운동)");
  assert.equal(hit.distanceM, 2);
  assert.equal(nearestAddress(rows, 37.59, 126.9704), null, "150m 밖");
  assert.equal(nearestAddress([], 37.5, 127), null);
  assert.equal(hit.pnu, null, "v1 격자(지번 칸 없음)는 지번 없음");
});

test("지번: PNU로 지번 표기, 산·부번 0 처리, 30m 넘으면 저장 안 함", () => {
  const row = (pnu, apt = "") => [3758440, 12697040, "서울특별시", "종로구", "청운동", "자하문로", "0", "94", "0", "", "공동주택", "청운효자동", pnu, apt];
  assert.equal(formatJibun(row("1111010100101440003")), "서울특별시 종로구 청운동 144-3");
  assert.equal(formatJibun(row("1111010100200120000")), "서울특별시 종로구 청운동 산 12");
  assert.equal(formatJibun(row("")), null);
  const hit = nearestAddress([row("1111010100101440003", "1")], 37.5844, 126.9704);
  assert.equal(hit.pnu, "1111010100101440003");
  assert.equal(hit.apartment, true);
  assert.deepEqual(autoParcel(hit), { address: hit.address, pnu: hit.pnu, jibun: "서울특별시 종로구 청운동 144-3" });
  assert.deepEqual(autoParcel({ ...hit, distanceM: 31 }), { address: null, pnu: null, jibun: null });
  assert.deepEqual(autoParcel(null), { address: null, pnu: null, jibun: null });
});
