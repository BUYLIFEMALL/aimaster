// 리믹스 카드 → 플레이리스트 바로가기 주소(lib/remixShortcuts.ts) — Master msg_65425ac205e0
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PLAYLIST_APP_URL, playlistRemixUrl } from "../lib/remixShortcuts.ts";

const ID = "f547b493-c106-41ca-a86d-13c1be639c7b";

test("완료된 리믹스의 올바른 변주 번호 → 플레이리스트 /video?remix=<번호> 정확히", () => {
  assert.equal(playlistRemixUrl("completed", ID), `${PLAYLIST_APP_URL}/video?remix=${ID}`);
  assert.equal(PLAYLIST_APP_URL, "https://playlist-channel-studio.buylife.xyz", "기획 화면 기존 플레이리스트 링크와 같은 주소");
  assert.equal(playlistRemixUrl("completed", ID.toUpperCase()), `${PLAYLIST_APP_URL}/video?remix=${ID}`, "대문자 번호도 소문자로");
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

// ── 번호 소문자 표준화 (Master msg_8930e17e6f6f, Mac msg_18059f9141ae) ──
test("대문자 입력 → 받는 쪽이 읽는 번호는 DB 형식(소문자)과 글자 그대로 같다", () => {
  const dbId = ID; // DB uuid는 소문자로 저장·응답
  for (const sent of [ID.toUpperCase(), ID, "F547B493-c106-41CA-a86d-13C1BE639C7B"]) {
    const url = new URL(playlistRemixUrl("completed", sent));
    const received = url.searchParams.get("remix"); // 플레이리스트 SunoImportPanel이 읽는 값
    assert.equal(received, dbId, sent);
    assert.ok([dbId].includes(received), "받는 쪽 목록(소문자 번호)과 일치");
  }
});

test("운영 주소 대조: 공식 app_url은 playlist-maker, 링크는 같은 프로젝트 별칭(기존 기획 화면 링크와 동일)", () => {
  const src = readFileSync(new URL("../lib/remixShortcuts.ts", import.meta.url), "utf8");
  assert.match(src, /공식 주소\(programs\.app_url\)는 https:\/\/playlist-maker\.buylife\.xyz/);
  const planning = readFileSync(new URL("../app/(dashboard)/plannings/[id]/page.tsx", import.meta.url), "utf8")
    + readFileSync(new URL("../components/plannings/PlanningListWithPicker.tsx", import.meta.url), "utf8")
    + readFileSync(new URL("../components/plannings/PlanningExportPicker.tsx", import.meta.url), "utf8");
  assert.ok(planning.includes(`${PLAYLIST_APP_URL}/video`), "기존 플레이리스트 링크와 같은 주소");
});
