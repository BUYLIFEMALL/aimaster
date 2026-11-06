// 실행: node --test lib/eraseRegion.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkEraseFile, clampRect, enableExpr, eraseFilter, erasedFileName, logFileName, toVideoRect } from "./eraseRegion.ts";

test("60초·100MB를 넘거나 길이를 못 읽으면 막는다", () => {
  assert.equal(checkEraseFile(10_000_000, 30), null);
  assert.equal(checkEraseFile(10_000_000, 60.4), null);
  assert.match(checkEraseFile(10_000_000, 61) ?? "", /60초/);
  assert.match(checkEraseFile(101 * 1024 * 1024, 10) ?? "", /100MB/);
  assert.match(checkEraseFile(1000, Infinity) ?? "", /길이/);
  assert.match(checkEraseFile(1000, undefined) ?? "", /길이/);
});

test("사각형은 가장자리에서 1화소 띄우고, 너무 작으면 버린다", () => {
  assert.deepEqual(clampRect({ x: 0, y: 0, w: 50, h: 20 }, 1280, 720), { x: 1, y: 1, w: 49, h: 19 });
  assert.deepEqual(clampRect({ x: 1200, y: 700, w: 200, h: 100 }, 1280, 720), { x: 1200, y: 700, w: 79, h: 19 });
  assert.equal(clampRect({ x: 10, y: 10, w: 2, h: 40 }, 1280, 720), null);
});

test("화면 크기 사각형을 영상 화소로 바꾸고, 거꾸로 끈 것도 받는다", () => {
  const shown = { w: 640, h: 360 };
  const video = { w: 1280, h: 720 };
  assert.deepEqual(toVideoRect({ x: 100, y: 50, w: 40, h: 20 }, shown, video), { x: 200, y: 100, w: 80, h: 40 });
  assert.deepEqual(toVideoRect({ x: 140, y: 70, w: -40, h: -20 }, shown, video), { x: 200, y: 100, w: 80, h: 40 });
  assert.equal(toVideoRect({ x: 1, y: 1, w: 5, h: 5 }, { w: 0, h: 0 }, video), null);
});

test("적용 시간: 비우면 전체, 한쪽만 써도 되고, 거꾸로면 오류", () => {
  assert.deepEqual(enableExpr("", ""), {});
  assert.deepEqual(enableExpr("0", ""), {});
  assert.deepEqual(enableExpr("2", ""), { expr: "gte(t,2)" });
  assert.deepEqual(enableExpr("", "5.5"), { expr: "lte(t,5.5)" });
  assert.deepEqual(enableExpr("2", "5"), { expr: "between(t,2,5)" });
  assert.ok(enableExpr("5", "2").error);
  assert.ok(enableExpr("-1", "").error);
  assert.ok(enableExpr("가", "").error);
});

test("필터: 사각형마다 delogo + 짝수 크기 맞추기", () => {
  const rects = [{ x: 10, y: 20, w: 30, h: 40 }, { x: 100, y: 5, w: 8, h: 8 }];
  assert.equal(
    eraseFilter(rects),
    "delogo=x=10:y=20:w=30:h=40,delogo=x=100:y=5:w=8:h=8,scale=trunc(iw/2)*2:trunc(ih/2)*2",
  );
  assert.equal(
    eraseFilter(rects.slice(0, 1), "between(t,2,5)"),
    "delogo=x=10:y=20:w=30:h=40:enable='between(t,2,5)',scale=trunc(iw/2)*2:trunc(ih/2)*2",
  );
});

test("파일 이름", () => {
  assert.equal(erasedFileName("내 영상.mov"), "내 영상-지움.mp4");
  assert.equal(erasedFileName(".mp4"), "video-지움.mp4");
  assert.equal(logFileName("  "), "video");
  assert.equal(logFileName("a".repeat(300)).length, 200);
});
