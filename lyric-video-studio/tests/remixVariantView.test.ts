// 리믹스 변주 가사 영상 표시 판정(src/lib/remixVariantView.ts) — 리믹스 가사 1차 인수 K1~K4. 가사 원문은 출력하지 않는다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { remixVariantView, REMIX_TIMED_BLOCKED } from "../src/lib/remixVariantView.ts";
import { pickRemixLyricText } from "../src/lib/remixLyrics.ts";
import { isMissingLyricsColumnError } from "../src/lib/remixVariantInsert.ts";

const NOTICE = "Suno가 준 가사입니다 — 확인해 주세요";
const R = (o: Partial<{ task_id: string | null; mode: string; lyrics: string | null; instrumental: boolean; extend_hop_count: number | null }> = {}) =>
  ({ task_id: "T1", mode: "add_vocals", lyrics: null, instrumental: false, extend_hop_count: 0, ...o });
const V = (o: Record<string, unknown> = {}) => ({ suno_audio_id: "A1", ...o });
const view = (r: ReturnType<typeof R>, v: ReturnType<typeof V>) => remixVariantView(r, v, pickRemixLyricText);

test("사본이 기준(music/lib)과 같다 — 첫 줄 사본 표시만 다름", () => {
  for (const name of ["remixLyrics", "remixVariantInsert"]) {
    const copy = readFileSync(new URL(`../src/lib/${name}.ts`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
    const base = readFileSync(new URL(`../../music/lib/${name}.ts`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
    assert.ok(copy.startsWith("// 사본 — 기준 music/lib/"), `${name} 사본 표시`);
    assert.equal(copy.slice(copy.indexOf("\n") + 1), base, `${name} 본문 동일`);
  }
});

test("K4 회원 원문 우선 — Suno 가사가 있어도 덮지 않고 안내 없음", () => {
  const r = view(R({ lyrics: "회원 표본 가사" }), V({ lyrics: "표본 가사 가", lyrics_status: "provided_unverified", suno_task_id: "T0" }));
  assert.equal(r.lyricText, "회원 표본 가사");
  assert.equal(r.lyricsNotice, null);
});

test("K4 회원 원문 없음 + Suno 미검증 가사 → 채우고 안내", () => {
  const r = view(R(), V({ lyrics: "표본 가사 가", lyrics_status: "provided_unverified", suno_task_id: "T0" }));
  assert.equal(r.lyricText, "표본 가사 가");
  assert.equal(r.lyricsNotice, NOTICE);
});

test("K4 빈 가사·unknown·empty·모르는 상태 값·구형 DB(칸 없음) → 가사 없음, 안내 없음", () => {
  for (const v of [V({ lyrics_status: "unknown" }), V({ lyrics_status: "empty", lyrics: "x" }), V({ lyrics_status: "provided", lyrics: "표본" }), V({ lyrics_status: "weird", lyrics: "표본" }), V()]) {
    const r = view(R(), v);
    assert.equal(r.lyricText, "");
    assert.equal(r.lyricsNotice, null);
  }
});

test("가사 없는 종류(반주 추가·연주곡) → 가사·시간 가사 모두 없음", () => {
  for (const r0 of [R({ mode: "add_instrumental" }), R({ mode: "cover", instrumental: true })]) {
    const r = view(r0, V({ lyrics: "표본", lyrics_status: "provided_unverified", suno_task_id: "T0" }));
    assert.deepEqual(r, { vocal: false, lyricText: "", lyricsNotice: null, timedTaskId: null, timedBlockedReason: null });
  }
});

test("K2 시간 가사 작업 번호 — 변주 자신의 번호 우선", () => {
  assert.equal(view(R({ task_id: "T1", extend_hop_count: 1 }), V({ suno_task_id: "T0" })).timedTaskId, "T0");
});

test("K2 변주 번호 없음 + 연장한 적 없음(hop 0) → 부모 번호", () => {
  const r = view(R({ task_id: "T0", extend_hop_count: 0 }), V());
  assert.equal(r.timedTaskId, "T0");
  assert.equal(r.timedBlockedReason, null);
});

test("K2 변주 번호 없음 + 연장된 리믹스(hop>0, 구형 DB 포함) → 호출 전 차단", () => {
  for (const hop of [1, 2, 3]) {
    const r = view(R({ task_id: "T3", extend_hop_count: hop }), V());
    assert.equal(r.timedTaskId, null);
    assert.equal(r.timedBlockedReason, REMIX_TIMED_BLOCKED);
  }
});

test("K1 연장 단계를 모르면(null) 부모 번호를 믿지 않고 차단", () => {
  const r = view(R({ extend_hop_count: null }), V());
  assert.equal(r.timedTaskId, null);
  assert.equal(r.timedBlockedReason, REMIX_TIMED_BLOCKED);
});

test("오디오 번호가 없으면 시간 가사 대상 아님(차단 안내도 없음)", () => {
  const r = view(R(), V({ suno_audio_id: null, suno_task_id: "T0" }));
  assert.equal(r.timedTaskId, null);
  assert.equal(r.timedBlockedReason, null);
});

test("K3 조회 fallback 근거 — 이번 칸이 변주 표에 없다는 형식만", () => {
  // PostgREST select가 없는 칸을 만나면 「column 표.칸 does not exist」(42703) 형식
  assert.equal(isMissingLyricsColumnError({ code: "42703", message: "column music_track_remix_variants.lyrics does not exist" }), true);
  assert.equal(isMissingLyricsColumnError({ code: "42703", message: "column music_track_remix_variants.suno_task_id does not exist" }), true);
  assert.equal(isMissingLyricsColumnError({ code: "42703", message: "column music_track_remixes.extend_hop_count does not exist" }), false, "리믹스 표 칸은 대상 아님");
  assert.equal(isMissingLyricsColumnError({ code: "42703", message: "column music_track_remix_variants.image_url does not exist" }), false, "다른 칸");
  assert.equal(isMissingLyricsColumnError({ code: "42501", message: "permission denied" }), false, "권한");
  assert.equal(isMissingLyricsColumnError({ code: "", message: "TypeError: fetch failed" }), false, "전송 실패");
});

test("K3 suno.ts — fallback 조회도 소유자 조건 두 개 유지, 리믹스 조회에 extend_hop_count 포함", () => {
  const src = readFileSync(new URL("../src/lib/suno.ts", import.meta.url), "utf8");
  assert.match(src, /readRemixVariant = \(cols: string\) => db\.from\("music_track_remix_variants"\)\.select\(cols\)\.eq\("id", variantId\)\.eq\("user_id", userId\)/);
  assert.match(src, /if \(rvRes\.error && isMissingLyricsColumnError\(rvRes\.error\)\) rvRes = await readRemixVariant\(REMIX_VARIANT_COLS_LEGACY\)/);
  assert.match(src, /select\("task_id, mode, source_title, lyrics, instrumental, extend_hop_count"\)\s*\.eq\("id", rv\.remix_id\)\.eq\("user_id", userId\)/);
  assert.match(src, /if \(v\.remix\?\.timedBlockedReason\) throw new UserError\(400, v\.remix\.timedBlockedReason\);[^\n]*\n\s*const taskId/, "키 조회·호출보다 먼저 차단");
});
