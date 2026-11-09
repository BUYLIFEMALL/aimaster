import test from "node:test";
import assert from "node:assert/strict";
import { fmsFileName, fmsTrackId, saveFmsBgm, takeFmsBgm } from "../src/lib/fmsBgm.ts";

// node에는 sessionStorage가 없어 간단한 대역을 둔다
const store = new Map<string, string>();
(globalThis as unknown as { sessionStorage: unknown }).sessionStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
const U = "4a82ff77-97f7-474d-866e-8e9431858ed3";

test("주소 #fms=<곡 번호>만 읽는다", () => {
  assert.equal(fmsTrackId(`#fms=${U}`), U);
  assert.equal(fmsTrackId("#fms=abc"), null);
  assert.equal(fmsTrackId(""), null);
});

test("파일 이름 — 못 쓰는 글자 빼고, 확장자 없으면 .mp3", () => {
  assert.equal(fmsFileName("새벽:감성/곡"), "새벽감성곡.mp3");
  assert.equal(fmsFileName("song.wav"), "song.wav");
  assert.equal(fmsFileName(undefined), "무료음악.mp3");
});

test("받기 화면 → 렌더 화면: 회원 폴더 bgm 경로만 받고 한 번 꺼내면 지운다", () => {
  saveFmsBgm({ path: `${U}/bgm/${U}.mp3`, name: "곡.mp3" });
  assert.deepEqual(takeFmsBgm(), { path: `${U}/bgm/${U}.mp3`, name: "곡.mp3" });
  assert.equal(takeFmsBgm(), null);
  saveFmsBgm({ path: `${U}/voice/${U}.wav`, name: "x" });
  assert.equal(takeFmsBgm(), null);
  saveFmsBgm({ path: `../${U}/bgm/${U}.mp3`, name: "x" });
  assert.equal(takeFmsBgm(), null);
});
