import test from "node:test";
import assert from "node:assert/strict";
import { albumsHref, mergeAlbums, parseAlbumPrompt, parseAlbumTitle } from "../src/lib/albums.ts";

const a = "3f2b8c1e-1a2b-4c3d-8e9f-0123456789ab";
const b = "4f2b8c1e-1a2b-4c3d-8e9f-0123456789ab";
const row = (id, title) => ({ id, title, art_prompt: "", created_at: "2026-11-07T00:00:00Z" });

test("앨범 이름(v1.35): 공백 정리, 빈 이름·60자 초과 거절", () => {
  assert.deepEqual(parseAlbumTitle("  가을   기차 "), { ok: true, value: "가을 기차" });
  assert.equal(parseAlbumTitle("  ").ok, false);
  assert.equal(parseAlbumTitle(3).ok, false);
  assert.equal(parseAlbumTitle("가".repeat(61)).ok, false);
});

test("앨범 그림 설명: 1000자까지 자르고 문자열이 아니면 빈 값", () => {
  assert.equal(parseAlbumPrompt(" sunset "), "sunset");
  assert.equal(parseAlbumPrompt("x".repeat(1200)).length, 1000);
  assert.equal(parseAlbumPrompt(null), "");
});

test("앨범 목록 합치기: PC에 없는 기록은 onPc=false, 기록 없는 PC 그림은 「이름 없는 앨범」, 엔진이 없으면 onPc=null", () => {
  const merged = mergeAlbums([row(a, "가을")], [b]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].onPc, false);
  assert.equal(merged[1].orphan, true);
  assert.equal(merged[1].title, "이름 없는 앨범");
  assert.deepEqual(mergeAlbums([row(a, "가을")], [a]).map((x) => x.onPc), [true]);
  assert.deepEqual(mergeAlbums([row(a, "가을")], null).map((x) => x.onPc), [null]);
});

test("앨범 화면 주소: 곡 제목·그림 설명·곡 번호를 채워 연다", () => {
  assert.equal(albumsHref(), "/albums");
  const u = new URL(albumsHref({ title: "가을 기차", art: "노을", track: a }), "https://x");
  assert.equal(u.pathname, "/albums");
  assert.equal(u.searchParams.get("title"), "가을 기차");
  assert.equal(u.searchParams.get("art"), "노을");
  assert.equal(u.searchParams.get("track"), a);
});
