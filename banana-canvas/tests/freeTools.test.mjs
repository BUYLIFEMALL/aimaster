// E5 「🧰 무료 이미지 도구」 계산 시험 — 배경 지우기 전·후처리, 얼굴 상자, 모자이크 칸, 사진 나누기(그리기·모델 실행은 브라우저에서만)
import test from "node:test";
import assert from "node:assert/strict";
import {
  bgInput, probToAlpha, faceInput, faceBoxes, clampRect, mosaicCell, evenCuts, moveCut, splitRects, pieceNames, SPLIT_LAYOUTS,
} from "../src/lib/freeTools/calc.ts";

test("배경 입력: 채널 분리·ImageNet 정규화", () => {
  const rgba = [255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 0, 0, 0, 255]; // 2×2
  const x = bgInput(rgba, 2);
  assert.equal(x.length, 12);
  assert.ok(Math.abs(x[0] - (1 - 0.485) / 0.229) < 1e-5); // R 첫 픽셀
  assert.ok(Math.abs(x[4 + 1] - (1 - 0.456) / 0.224) < 1e-5); // G 둘째 픽셀
  assert.ok(Math.abs(x[8 + 2] - (1 - 0.406) / 0.225) < 1e-5); // B 셋째 픽셀
});

test("확률맵 → 알파: 최저 0·최고 255로 펼침, 모두 같으면 투명", () => {
  assert.deepEqual([...probToAlpha([0, 0.5, 1])], [0, 128, 255]);
  assert.deepEqual([...probToAlpha([0.5, 0.5])], [0, 0]);
});

test("얼굴 입력: (값-127)/128", () => {
  const x = faceInput([127, 255, 0, 255], 1, 1);
  assert.deepEqual([...x], [0, 1, -127 / 128]);
});

test("얼굴 상자: 기준 이하 버림·겹침 제거·넓히기·그림 안으로", () => {
  const scores = [0.1, 0.9, 0.2, 0.8, 0.5, 0.5, 0.05, 0.95];
  const boxes = [
    0.4, 0.2, 0.6, 0.5, // 얼굴 A(0.9)
    0.41, 0.21, 0.61, 0.51, // A와 거의 같은 상자(0.8) → 제거
    0.0, 0.0, 0.1, 0.1, // 점수 0.5 → 기준 미달
    0.9, 0.9, 1.05, 1.1, // 얼굴 B(0.95), 그림 밖 → 자름
  ];
  const r = faceBoxes(scores, boxes, 1000, 1000, { grow: 0 });
  assert.equal(r.length, 2);
  assert.deepEqual(r[0], { x: 900, y: 900, w: 100, h: 100 }); // 점수 높은 B 먼저, 1000에서 잘림
  assert.deepEqual(r[1], { x: 400, y: 200, w: 200, h: 300 });
  const g = faceBoxes([0, 0.9], [0.4, 0.4, 0.6, 0.6], 100, 100, { grow: 0.5 });
  assert.deepEqual(g[0], { x: 30, y: 30, w: 40, h: 40 });
});

test("상자 정리: 거꾸로 그린 네모·밖으로 나간 네모", () => {
  assert.deepEqual(clampRect({ x: 50, y: 50, w: -20, h: -10 }, 100, 100), { x: 30, y: 40, w: 20, h: 10 });
  assert.deepEqual(clampRect({ x: -10, y: 90, w: 30, h: 30 }, 100, 100), { x: 0, y: 90, w: 20, h: 10 });
});

test("모자이크 칸: 강도·크기에 비례, 최소 6px", () => {
  assert.equal(mosaicCell({ x: 0, y: 0, w: 20, h: 20 }, 1), 6);
  assert.equal(mosaicCell({ x: 0, y: 0, w: 300, h: 200 }, 5), 35);
  assert.ok(mosaicCell({ x: 0, y: 0, w: 300, h: 200 }, 10) > mosaicCell({ x: 0, y: 0, w: 300, h: 200 }, 3));
});

test("나누기: 고른 선·선 옮기기(교차 불가)·조각 좌표", () => {
  assert.deepEqual(evenCuts(4), [0.25, 0.5, 0.75]);
  assert.deepEqual(evenCuts(1), []);
  assert.deepEqual(moveCut([0.25, 0.5, 0.75], 1, 0.9), [0.25, 0.7, 0.75]); // 오른쪽 이웃-간격에서 멈춤
  assert.deepEqual(moveCut([0.5], 0, -1), [0.05]);
  const r = splitRects(101, 50, [0.5], [0.5]);
  assert.equal(r.length, 4);
  assert.deepEqual(r[0], { x: 0, y: 0, w: 51, h: 25 });
  assert.deepEqual(r[3], { x: 51, y: 25, w: 50, h: 25 });
  assert.equal(r.reduce((s, b) => s + b.w * b.h, 0), 101 * 50); // 틈·겹침 없음
  for (const k of Object.keys(SPLIT_LAYOUTS)) {
    const { cols, rows } = SPLIT_LAYOUTS[k];
    assert.equal(splitRects(800, 600, evenCuts(cols), evenCuts(rows)).length, cols * rows);
  }
});

test("조각 파일 이름", () => {
  assert.deepEqual(pieceNames("상품 사진.jpg", 3, "png"), ["상품 사진_01.png", "상품 사진_02.png", "상품 사진_03.png"]);
  assert.equal(pieceNames("a/b.png", 1, "jpg")[0], "a_b_01.jpg");
});
