// v1.17 인스타 직접 게시 — 여백 맞춤·경로 검사
import test from "node:test";
import assert from "node:assert/strict";
import { MAX_EDGE, MAX_FEED_RATIO, MIN_FEED_RATIO, feedPad, validInstaPaths } from "../src/lib/instagram/feed.ts";

test("비율 안(정사각·4:5·가로 1.5)은 여백 없이 그대로", () => {
  for (const [w, h] of [[1000, 1000], [800, 1000], [1200, 800]]) {
    const p = feedPad(w, h);
    assert.deepEqual([p.width, p.height, p.dx, p.dy], [w, h, 0, 0]);
  }
});

test("너무 세로로 긴 그림(세로 4컷 1:4)은 좌우 흰 여백으로 4:5, 그림은 줄이기만", () => {
  const p = feedPad(500, 2000);
  assert.ok(Math.abs(p.width / p.height - MIN_FEED_RATIO) < 0.01);
  assert.ok(Math.max(p.width, p.height) <= MAX_EDGE);
  assert.ok(p.dx > 0 && p.dy === 0, "좌우 여백");
  assert.ok(Math.abs(p.dw / p.dh - 500 / 2000) < 0.01, "그림 비율 유지");
});

test("너무 가로로 긴 그림(가로 4컷 4:1)은 위아래 여백으로 1.91:1", () => {
  const p = feedPad(4000, 1000);
  assert.ok(Math.abs(p.width / p.height - MAX_FEED_RATIO) < 0.01);
  assert.ok(p.dy > 0 && p.dx === 0, "위아래 여백");
  assert.equal(p.width, MAX_EDGE);
});

test("임시 경로는 회원 본인 fourcut-insta 폴더의 .jpg 1~10장만", () => {
  const u = "11111111-2222-3333-4444-555555555555";
  assert.equal(validInstaPaths(u, [`${u}/fourcut-insta/b/01.jpg`]), true);
  assert.equal(validInstaPaths(u, []), false);
  assert.equal(validInstaPaths(u, [`x/fourcut-insta/b/01.jpg`]), false);
  assert.equal(validInstaPaths(u, [`${u}/webtoon-insta/b/01.jpg`]), false);
  assert.equal(validInstaPaths(u, [`${u}/fourcut-insta/../x/01.jpg`]), false);
  assert.equal(validInstaPaths(u, Array.from({ length: 11 }, (_, i) => `${u}/fourcut-insta/b/${i}.jpg`)), false);
});

import { MAX_BATCH_EPISODES, episodeTimes, sortForBatch, workCaption } from "../src/lib/instagram/feed.ts";

test("회차 묶음: 간격대로 시각 계산(달·해 넘김 포함), 잘못된 입력은 빈 목록", () => {
  assert.deepEqual(episodeTimes("2026-10-27T19:00", 3, 7), ["2026-10-27T19:00", "2026-11-03T19:00", "2026-11-10T19:00"]);
  assert.deepEqual(episodeTimes("2026-12-31T23:30", 2, 1), ["2026-12-31T23:30", "2027-01-01T23:30"]);
  assert.deepEqual(episodeTimes("2026-10-27 19:00", 2, 7), []);
  assert.equal(MAX_BATCH_EPISODES, 20);
});

test("작품 순서: 화 오름차순, 같은 화는 먼저 만든 것부터", () => {
  const w = (id, episode, createdAt) => ({ id, episode, createdAt });
  assert.deepEqual(sortForBatch([w("c", 3, 1), w("a", 1, 5), w("b", 1, 2), w("d", 2, 9)]).map((x) => x.id), ["b", "a", "d", "c"]);
});

test("회차 캡션: 2화부터 화 번호, 제목이 없으면 「4컷 만화」", () => {
  assert.equal(workCaption("출근길", 1), "출근길\n\n#4컷만화 #인스타툰 #만화");
  assert.equal(workCaption("출근길", 3), "출근길 3화\n\n#4컷만화 #인스타툰 #만화");
  assert.ok(workCaption(" ", 1).startsWith("4컷 만화"));
});
