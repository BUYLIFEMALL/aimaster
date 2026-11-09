import test from "node:test";
import assert from "node:assert/strict";
import { fmsTrackId, fmsFileName, fmsTitle, fmsContentType, fmsBgmPath, isOwnFmsBgmPath, FMS_READY_TYPE } from "../src/lib/fmsBgm.ts";

const ID = "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed";
const U = "11111111-2222-3333-4444-555555555555";
const V = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

test("D-6 곡 번호 읽기: #fms=와 ?fms= 둘 다, 그 밖은 null", () => {
  assert.equal(fmsTrackId(`#fms=${ID}`), ID);
  assert.equal(fmsTrackId(`?fms=${ID}`), ID);
  assert.equal(fmsTrackId(`#fms=${ID},${ID}`), null);
  assert.equal(fmsTrackId("#fms=abc"), null);
  assert.equal(fmsTrackId(""), null);
  assert.equal(FMS_READY_TYPE, "shs-ready");
});

test("D-6 파일 이름·제목·형식", () => {
  assert.equal(fmsFileName("봄날 산책.mp3"), "봄날 산책.mp3");
  assert.equal(fmsFileName("a/b:c"), "abc.mp3");
  assert.equal(fmsFileName(undefined), "무료음악.mp3");
  assert.equal(fmsTitle("봄날 산책.mp3"), "봄날 산책");
  assert.equal(fmsContentType("x.mp3"), "audio/mpeg");
  assert.equal(fmsContentType("x.wav"), "audio/wav");
  assert.equal(fmsContentType("x.m4a"), "audio/mp4");
});

test("D-6 저장 경로는 회원 폴더·영상 번호로 시작, 남의 경로는 거절", () => {
  const p = fmsBgmPath(U, V, ID, "곡.mp3");
  assert.equal(p, `${U}/${V}-fms-${ID}.mp3`);
  assert.ok(isOwnFmsBgmPath(p, U, V));
  assert.ok(!isOwnFmsBgmPath(p, V, V));
  assert.ok(!isOwnFmsBgmPath(`${U}/${V}-fms-${ID}.exe`, U, V));
  assert.ok(!isOwnFmsBgmPath(`${U}/../${V}-fms-${ID}.mp3`, U, V));
});
