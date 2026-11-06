// 실행: node --test lib/screenRecord.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { canRecordScreen, pickRecordMime, recordedSeconds, recordingFileName, remainingSeconds } from "./screenRecord.ts";

test("녹화 형식은 vp9 → vp8 → webm 순서로 고른다", () => {
  assert.equal(pickRecordMime(() => true), "video/webm;codecs=vp9");
  assert.equal(pickRecordMime((m) => m !== "video/webm;codecs=vp9"), "video/webm;codecs=vp8");
  assert.equal(pickRecordMime((m) => m === "video/webm"), "video/webm");
  assert.equal(pickRecordMime(() => false), "");
});

test("getDisplayMedia와 MediaRecorder가 모두 있어야 녹화할 수 있다", () => {
  assert.equal(canRecordScreen({ mediaDevices: { getDisplayMedia: () => {} }, hasMediaRecorder: true }), true);
  assert.equal(canRecordScreen({ mediaDevices: {}, hasMediaRecorder: true }), false);
  assert.equal(canRecordScreen({ mediaDevices: undefined, hasMediaRecorder: true }), false);
  assert.equal(canRecordScreen({ mediaDevices: { getDisplayMedia: () => {} }, hasMediaRecorder: false }), false);
});

test("파일 이름은 날짜·시각을 두 자리로 채운다", () => {
  assert.equal(recordingFileName(new Date(2026, 10, 6, 9, 5, 3)), "화면녹화-20261106-090503.webm");
});

test("남은 초는 올림하고 0 아래로 내려가지 않는다", () => {
  assert.equal(remainingSeconds(0), 15);
  assert.equal(remainingSeconds(100), 15);
  assert.equal(remainingSeconds(1000), 14);
  assert.equal(remainingSeconds(14_900), 1);
  assert.equal(remainingSeconds(20_000), 0);
});

test("녹화한 시간은 소수 한 자리, 최대 15초", () => {
  assert.equal(recordedSeconds(3_456), 3.5);
  assert.equal(recordedSeconds(16_000), 15);
  assert.equal(recordedSeconds(-5), 0);
});
