// 리믹스 → 플레이리스트 받기 규칙(src/lib/remixTracks.ts) — 사전 검토 .ai/results/MUSIC-20261119-REMIX-PLAYLIST-PRECHECK-CC-MUSIC-01.md
import test from "node:test";
import assert from "node:assert/strict";
import { mergeIncoming, parseIdParam, remixIsVocal, remixTitle, remixTrack } from "../src/lib/remixTracks.ts";

const A = "11111111-1111-1111-1111-111111111111", B = "22222222-2222-2222-2222-222222222222", C = "33333333-3333-3333-3333-333333333333";
const v = (id, created_at, suno_audio_id = "aud") => ({ id, created_at, suno_audio_id, duration_seconds: 177 });

test("보컬 판정: 보컬 추가·매시업은 노래, 반주 추가·연주곡 표시는 연주곡", () => {
  assert.equal(remixIsVocal({ mode: "add_vocals", instrumental: false }), true);
  assert.equal(remixIsVocal({ mode: "mashup", instrumental: false }), true);
  assert.equal(remixIsVocal({ mode: "add_instrumental", instrumental: false }), false);
  assert.equal(remixIsVocal({ mode: "cover", instrumental: true }), false);
});

test("제목: 「원곡 (방식)」, 원곡 제목이 비면 「제목 없음」, 모르는 방식은 「리믹스」", () => {
  assert.equal(remixTitle({ source_title: "빗속의 다짐", mode: "mashup" }), "빗속의 다짐 (매시업)");
  assert.equal(remixTitle({ source_title: "  ", mode: "add_vocals" }), "제목 없음 (보컬 추가)");
  assert.equal(remixTitle({ source_title: "곡", mode: null }), "곡 (리믹스)");
});

test("곡 목록 한 줄: 변주는 만든 순서, 시간 가사는 노래 + 작업 번호 + 소리 번호가 다 있을 때만", () => {
  const t = remixTrack({ id: "r1", mode: "add_vocals", instrumental: false, source_title: "곡", task_id: "task", created_at: "2026-11-01T00:00:00Z",
    variants: [v(B, "2026-11-01T00:00:02Z"), v(A, "2026-11-01T00:00:01Z", null)] });
  assert.equal(t.mode, "vocal");
  assert.deepEqual(t.variants.map((x) => [x.id, x.canTime]), [[A, false], [B, true]]);
  const inst = remixTrack({ id: "r2", mode: "add_instrumental", instrumental: false, source_title: "곡", task_id: "task", created_at: "2026-11-01T00:00:00Z", variants: [v(C, "2026-11-01T00:00:01Z")] });
  assert.equal(inst.mode, "instrumental");
  assert.equal(inst.variants[0].canTime, false, "반주 추가는 시간 가사를 받지 않는다");
  const noTask = remixTrack({ id: "r3", mode: "mashup", instrumental: false, source_title: "곡", task_id: null, created_at: "2026-11-01T00:00:00Z", variants: [v(C, "2026-11-01T00:00:01Z")] });
  assert.equal(noTask.variants[0].canTime, false);
});

test("변주가 없는 리믹스는 목록에 넣지 않는다", () => {
  assert.equal(remixTrack({ id: "r", mode: "mashup", instrumental: false, source_title: "곡", task_id: "t", created_at: "2026-11-01T00:00:00Z", variants: [] }), null);
});

test("주소 읽기: 올바른 번호만·중복 제거, 빈 값·없는 값은 빈 목록", () => {
  assert.deepEqual(parseIdParam(` ${A},bad,${A},${B} `), [A, B]);
  assert.deepEqual(parseIdParam(""), []);
  assert.deepEqual(parseIdParam(null), []);
});

test("합치기: 기존 ?suno= 곡 먼저, 리믹스 뒤에, 겹치면 한 번, 최대 개수(20) 유지", () => {
  assert.deepEqual(mergeIncoming([A, B], [B, C], 20), [A, B, C]);
  assert.deepEqual(mergeIncoming([], [C], 20), [C], "리믹스만 와도 받는다");
  assert.deepEqual(mergeIncoming([A], [], 20), [A], "기존 ?suno= 흐름 그대로");
  const many = Array.from({ length: 25 }, (_, i) => `${String(i).padStart(8, "0")}-0000-0000-0000-000000000000`);
  assert.equal(mergeIncoming(many, [C], 20).length, 20);
  assert.ok(!mergeIncoming(many, [C], 20).includes(C), "넘치면 앞쪽(기존 곡)이 우선");
});

// ── 곡 번호 직접 조회(ownVariant의 리믹스 경로) — 곡 목록과 같은 「본인 + 완료」 조건 (Master msg_5118e37c0e3b) ──
import { readFileSync } from "node:fs";
import { lookupRemixVariant } from "../src/lib/remixTracks.ts";

const ME = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", OTHER = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
/** 표 이름별 행 목록 + 들어온 조회 기록. eq는 같은 칸 값이 같은 행만 남기고, maybeSingle은 첫 행 */
function fakeDb(tables, failOn = null) {
  const log = [];
  return {
    log,
    from(table) {
      return { select(columns) {
        const filters = [];
        const q = {
          eq(c, v) { filters.push([c, v]); return q; },
          maybeSingle() {
            log.push({ table, columns, filters: [...filters] });
            if (failOn === table) return Promise.resolve({ data: null, error: { message: "db down" } });
            const row = (tables[table] ?? []).find((r) => filters.every(([c, v]) => r[c] === v)) ?? null;
            return Promise.resolve({ data: row, error: null });
          },
        };
        return q;
      } };
    },
  };
}
const variant = (over = {}) => ({ id: A, remix_id: "rm1", user_id: ME, suno_audio_id: "aud", audio_url: "https://x/storage/v1/object/public/music-audio/a.mp3", image_url: null, ...over });
const remix = (over = {}) => ({ id: "rm1", user_id: ME, status: "completed", mode: "add_vocals", instrumental: false, source_title: "빗속의 다짐", task_id: "task", ...over });

test("본인 완료 리믹스 → 곡 정보, 두 표 모두 user_id·부모는 status completed로 조회", async () => {
  const db = fakeDb({ music_track_remix_variants: [variant()], music_track_remixes: [remix()] });
  const v = await lookupRemixVariant(db, ME, A);
  assert.equal(v.music_tracks.title, "빗속의 다짐 (보컬 추가)");
  assert.equal(v.music_tracks.mode, "vocal");
  assert.equal(v.music_tracks.task_id, "task");
  assert.deepEqual(db.log[0].filters, [["id", A], ["user_id", ME]]);
  assert.deepEqual(db.log[1].filters, [["id", "rm1"], ["user_id", ME], ["status", "completed"]]);
});

for (const status of ["generating", "pending", "failed"]) {
  test(`본인 리믹스라도 부모가 ${status}(미완료)면 null → 기존 404, 서명·키·Suno 조회 없음`, async () => {
    const db = fakeDb({ music_track_remix_variants: [variant()], music_track_remixes: [remix({ status })] });
    assert.equal(await lookupRemixVariant(db, ME, A), null);
    assert.deepEqual(db.log.map((l) => l.table), ["music_track_remix_variants", "music_track_remixes"], "리믹스 두 표 말고는 아무것도 부르지 않음");
  });
}

test("다른 회원의 리믹스 변주는 null — 부모 조회도 하지 않는다", async () => {
  const db = fakeDb({ music_track_remix_variants: [variant({ user_id: OTHER })], music_track_remixes: [remix({ user_id: OTHER })] });
  assert.equal(await lookupRemixVariant(db, ME, A), null);
  assert.equal(db.log.length, 1);
});

test("변주는 내 것이어도 부모 리믹스가 다른 회원 것이면 null", async () => {
  const db = fakeDb({ music_track_remix_variants: [variant()], music_track_remixes: [remix({ user_id: OTHER })] });
  assert.equal(await lookupRemixVariant(db, ME, A), null);
});

test("반주 추가(완료)는 연주곡 — 작업·소리 번호를 비워 기존 시간 가사 판정이 막는다", async () => {
  const db = fakeDb({ music_track_remix_variants: [variant()], music_track_remixes: [remix({ mode: "add_instrumental" })] });
  const v = await lookupRemixVariant(db, ME, A);
  assert.equal(v.music_tracks.mode, "instrumental");
  assert.equal(v.music_tracks.task_id, null);
  assert.equal(v.suno_audio_id, null);
});

test("DB 오류는 삼키지 않고 던진다(빈 결과로 오인하지 않음)", async () => {
  await assert.rejects(() => lookupRemixVariant(fakeDb({}, "music_track_remix_variants"), ME, A), /db down/);
  await assert.rejects(() => lookupRemixVariant(fakeDb({ music_track_remix_variants: [variant()] }, "music_track_remixes"), ME, A), /db down/);
});

test("서버 순서: 곡 받기·시간 가사 모두 ownVariant(404 판정)가 서명 주소·Suno 키 조회보다 먼저", () => {
  const src = readFileSync(new URL("../src/lib/sunoTracks.ts", import.meta.url), "utf8");
  const body = (name) => src.slice(src.indexOf(`export async function ${name}(`), src.indexOf("\n}\n", src.indexOf(`export async function ${name}(`)));
  const get = body("getSunoVariant"), timed = body("fetchSunoTimedLines");
  assert.ok(get.indexOf("await ownVariant(") >= 0 && get.indexOf("await ownVariant(") < get.indexOf("signed("));
  assert.ok(timed.indexOf("await ownVariant(") >= 0 && timed.indexOf("await ownVariant(") < timed.indexOf("user_api_keys") && timed.indexOf("user_api_keys") < timed.indexOf("fetch("));
  assert.match(src, /if \(remix\) return remix;\s*\n\s*throw new SunoError\(404/);
});
