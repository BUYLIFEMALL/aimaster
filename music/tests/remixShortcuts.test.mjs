// 리믹스 카드 → 플레이리스트 바로가기 주소(lib/remixShortcuts.ts) — Master msg_65425ac205e0
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PLAYLIST_APP_URL, playlistRemixUrl } from "../lib/remixShortcuts.ts";

const ID = "f547b493-c106-41ca-a86d-13c1be639c7b";

test("완료된 리믹스의 올바른 변주 번호 → 플레이리스트 /video?remix=<번호> 정확히", () => {
  assert.equal(playlistRemixUrl("completed", ID), `${PLAYLIST_APP_URL}/video?remix=${ID}`);
  assert.equal(PLAYLIST_APP_URL, "https://playlist-channel-studio.buylife.xyz", "기획 화면 기존 플레이리스트 링크와 같은 주소");
  assert.equal(playlistRemixUrl("completed", ID.toUpperCase()), `${PLAYLIST_APP_URL}/video?remix=${ID.toUpperCase()}`);
});

test("미완료(생성 중·실패·기타)면 링크 없음 — 받는 쪽도 완료된 리믹스만 받는다", () => {
  for (const s of ["generating", "failed", "pending", "", null, undefined]) assert.equal(playlistRemixUrl(s, ID), null, String(s));
});

test("번호가 없거나 형식이 아니면 링크 없음 — 주소에 다른 매개변수·경로를 끼워 넣지 못함", () => {
  for (const id of [null, undefined, "", "abc", `${ID}&suno=x`, `${ID}/../x`, ` ${ID}`, `${ID}#x`, "00000000-0000-0000-0000-00000000000g"]) {
    assert.equal(playlistRemixUrl("completed", id), null, String(id));
  }
});

test("화면 연결: 가사 영상 링크는 그대로, 플레이리스트 링크는 playlistRemixUrl(remix.status, variant.id)가 주소를 줄 때만", () => {
  const ui = readFileSync(new URL("../components/remix/RemixCard.tsx", import.meta.url), "utf8");
  assert.match(ui, /href=\{`https:\/\/lyric-video-studio\.buylife\.xyz\/source\?remix=\$\{variant\.id\}`\}/, "기존 가사 영상 바로가기 유지");
  assert.match(ui, /const href = playlistRemixUrl\(remix\.status, variant\.id\);\s*\n\s*return href \? \(/);
  assert.match(ui, /플레이리스트 영상 만들기 →/);
  assert.doesNotMatch(ui, /playlist-channel-studio\.buylife\.xyz\/video\?remix=\$\{/, "주소를 화면에서 직접 이어 붙이지 않음");
});
