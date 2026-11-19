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

// ── 리믹스 파일 서명은 회원 본인 폴더 경로만 (Master msg_6bc9c6ee0c57) ──
import { ownStoragePath, signRemixAssets } from "../src/lib/remixTracks.ts";

const BASE = "https://proj.supabase.co", BUCKET = "music-audio";
const pub = (path, bucket = BUCKET) => `${BASE}/storage/v1/object/public/${bucket}/${path}`;
/** 서명 호출을 세는 가짜 sign — 실제로는 관리자 키 createSignedUrl */
function counter(fail = false) { const calls = []; return { calls, sign: async (p) => { calls.push(p); return fail ? null : `signed:${p}`; } }; }

test("회원 폴더 판정: 본인 `<user>/remix/…`만 경로, 다른 회원·외부·다른 저장소·우회 조각은 null", () => {
  assert.equal(ownStoragePath(pub(`${ME}/remix/rm1/0.mp3`), BASE, BUCKET, ME), `${ME}/remix/rm1/0.mp3`);
  assert.equal(ownStoragePath(pub(`${ME}/remix/rm1/0.mp3`) + "?t=1", BASE + "/", BUCKET, ME), `${ME}/remix/rm1/0.mp3`, "주소 꼬리·base 끝 / 무관");
  assert.equal(ownStoragePath(pub(`${OTHER}/remix/rm1/0.mp3`), BASE, BUCKET, ME), null, "다른 회원 폴더");
  assert.equal(ownStoragePath("https://cdn1.suno.ai/abc.mp3", BASE, BUCKET, ME), null, "외부 주소(Suno 임시 주소 포함)");
  assert.equal(ownStoragePath(pub(`${ME}/a.mp3`, "other-bucket"), BASE, BUCKET, ME), null, "다른 저장소");
  assert.equal(ownStoragePath(pub(`${ME}/../${OTHER}/a.mp3`), BASE, BUCKET, ME), null, "상위 폴더 우회");
  assert.equal(ownStoragePath(pub(`${ME}/%2e%2e/${OTHER}/a.mp3`), BASE, BUCKET, ME), null, "인코딩한 우회");
  assert.equal(ownStoragePath(pub(`${ME}`), BASE, BUCKET, ME), null, "폴더만 있고 파일 없음");
  assert.equal(ownStoragePath(pub(`${ME}//a.mp3`), BASE, BUCKET, ME), null, "빈 조각");
  assert.equal(ownStoragePath(pub(`${ME}/a%ZZ.mp3`), BASE, BUCKET, ME), null, "깨진 인코딩");
  assert.equal(ownStoragePath(null, BASE, BUCKET, ME), null);
  assert.equal(ownStoragePath(pub(`${ME}/a.mp3`), "", BUCKET, ME), null, "base가 비면 서명 안 함");
});

test("서명 호출 수: 본인 음악+커버 2번, 커버 없으면 1번", async () => {
  const c = counter();
  const r = await signRemixAssets({ audio_url: pub(`${ME}/remix/r/0.mp3`), image_url: pub(`${ME}/remix/r/0.jpg`) }, ME, BASE, BUCKET, c.sign);
  assert.deepEqual(c.calls, [`${ME}/remix/r/0.mp3`, `${ME}/remix/r/0.jpg`]);
  assert.equal(r.audioUrl, `signed:${ME}/remix/r/0.mp3`);
  const c2 = counter();
  assert.equal((await signRemixAssets({ audio_url: pub(`${ME}/remix/r/0.mp3`), image_url: null }, ME, BASE, BUCKET, c2.sign)).coverUrl, null);
  assert.equal(c2.calls.length, 1);
});

test("서명 호출 0번: 다른 회원 음악 경로·외부 음악 주소 — 커버가 본인 것이어도 서명하지 않는다", async () => {
  for (const audio of [pub(`${OTHER}/remix/r/0.mp3`), "https://cdn1.suno.ai/abc.mp3", pub(`${ME}/../${OTHER}/0.mp3`)]) {
    const c = counter();
    const r = await signRemixAssets({ audio_url: audio, image_url: pub(`${ME}/remix/r/0.jpg`) }, ME, BASE, BUCKET, c.sign);
    assert.deepEqual(r, { audioUrl: null, coverUrl: null });
    assert.equal(c.calls.length, 0, audio);
  }
});

test("음악은 본인·커버만 다른 회원/외부 → 음악만 서명(1번), 커버는 비움", async () => {
  for (const cover of [pub(`${OTHER}/remix/r/0.jpg`), "https://evil.example/x.jpg"]) {
    const c = counter();
    const r = await signRemixAssets({ audio_url: pub(`${ME}/remix/r/0.mp3`), image_url: cover }, ME, BASE, BUCKET, c.sign);
    assert.equal(c.calls.length, 1);
    assert.equal(r.coverUrl, null);
  }
});

test("음악 서명이 실패하면 커버는 서명하지 않는다(부르는 쪽 410)", async () => {
  const c = counter(true);
  assert.deepEqual(await signRemixAssets({ audio_url: pub(`${ME}/remix/r/0.mp3`), image_url: pub(`${ME}/remix/r/0.jpg`) }, ME, BASE, BUCKET, c.sign), { audioUrl: null, coverUrl: null });
  assert.equal(c.calls.length, 1);
});


test("서버: 리믹스만 회원 폴더 서명, 일반 SUNO 곡 경로(signed)는 그대로", () => {
  const src = readFileSync(new URL("../src/lib/sunoTracks.ts", import.meta.url), "utf8");
  const get = src.slice(src.indexOf("export async function getSunoVariant("), src.indexOf("\n}\n", src.indexOf("export async function getSunoVariant(")));
  assert.match(get, /if \(v\.remix\) \{[\s\S]*signRemixAssets\(v, userId,[\s\S]*signPath\)[\s\S]*return \{ id: v\.id[^\n]*\n\s*\}\n\s*const audioUrl = await signed\(v\.audio_url\);/);
  assert.match(get, /coverUrl: await signed\(v\.image_url\) \};$/m, "일반 곡 커버 서명 그대로");
});

// ── Mac 재검수 잔여 보완 (Master msg_0659fb81e981, Mac msg_bf5018c5c214) ──
import { REMIX_NOT_STORED, acceptResponse, incomingNotice, seedStep, splitIncoming } from "../src/lib/remixTracks.ts";

test("경로 조각은 공식 저장 키 형식만 — 역슬래시·%·물음표·공백·점으로 시작하는 조각은 서명 전에 거절", async () => {
  for (const bad of [`${ME}/remix/a\b.mp3`, `${ME}/remix/a%5Cb.mp3`, `${ME}/remix/a%3Fx.mp3`, `${ME}/remix/a%20b.mp3`, `${ME}/remix/.hidden.mp3`, `${ME}/remix/a%252e.mp3`, `${ME}/remix/a%2Fb.mp3`]) {
    assert.equal(ownStoragePath(pub(bad), BASE, BUCKET, ME), null, bad);
    const c = counter();
    assert.deepEqual(await signRemixAssets({ audio_url: pub(bad), image_url: null }, ME, BASE, BUCKET, c.sign), { audioUrl: null, coverUrl: null });
    assert.equal(c.calls.length, 0, `서명 0번: ${bad}`);
  }
  for (const good of [`${ME}/remix/rm1/0.mp3`, `${ME}/remix/rm1/cover-1_a.jpg`, `${ME}/remix/${A}/1.MP3`]) assert.equal(ownStoragePath(pub(good), BASE, BUCKET, ME), good);
});

test("저장되지 않은 리믹스 변주는 목록에서 「받을 수 없음」 — 시간 가사도 꺼짐, 저장된 변주는 그대로", () => {
  const t = remixTrack({ id: "r", mode: "add_vocals", instrumental: false, source_title: "곡", task_id: "task", created_at: "2026-11-01T00:00:00Z",
    variants: [{ ...v(A, "2026-11-01T00:00:01Z"), audio_url: "https://cdn1.suno.ai/a.mp3" }, { ...v(B, "2026-11-01T00:00:02Z"), audio_url: pub(`${ME}/remix/r/1.mp3`) }] },
    (x) => !!ownStoragePath(x.audio_url ?? null, BASE, BUCKET, ME));
  assert.deepEqual(t.variants.map((x) => [x.id, x.blocked ?? null, x.canTime]), [[A, REMIX_NOT_STORED, false], [B, null, true]]);
  const noCheck = remixTrack({ id: "r", mode: "add_vocals", instrumental: false, source_title: "곡", task_id: "task", created_at: "2026-11-01T00:00:00Z", variants: [v(A, "2026-11-01T00:00:01Z")] });
  assert.equal(noCheck.variants[0].blocked, undefined, "판정 함수가 없으면 표시 없음");
});

// ── 목록 재조회·부분 실패 (Master msg_e5ae913fe5a9, Mac msg_31e6f7c353b0) — 화면 load/useEffect가 그대로 쓰는 순수 함수로 상태 흐름을 모의 ──
const D = "44444444-4444-4444-4444-444444444444";
const NONE = { suno: false, remix: false };
const ok = (selectable, remixOk = true) => ({ state: "ok", selectable, remixOk });

test("출처별 나누기: 합쳐서 최대 개수(앞쪽 우선), 일반 곡과 겹치는 리믹스 번호는 일반 곡 쪽에만", () => {
  assert.deepEqual(splitIncoming([A, B], [B, C], 20), { suno: [A, B], remix: [C] });
  assert.deepEqual(splitIncoming([A, B], [C, D], 3), { suno: [A, B], remix: [C] });
});

test("미리 선택은 실제 성공 응답에서만 — 대기·실패 동안에는 선택·완료 표시 그대로(실패 뒤 새로고침 대기 렌더에서 초기화 금지)", () => {
  const inc = { suno: [A], remix: [C] };
  for (const view of [{ state: "idle" }, { state: "loading" }, { state: "error" }]) assert.deepEqual(seedStep(inc, NONE, view, [], 20), { picked: [], done: NONE });
  // 첫 요청 실패 → 새로고침 대기 → 성공: 성공 때 비로소 선택
  let s = { picked: [], done: NONE };
  s = seedStep(inc, s.done, { state: "error" }, s.picked, 20);
  s = seedStep(inc, s.done, { state: "loading" }, s.picked, 20);
  assert.deepEqual(s.picked, []);
  s = seedStep(inc, s.done, ok([A, C]), s.picked, 20);
  assert.deepEqual(s, { picked: [A, C], done: { suno: true, remix: true } });
});

test("리믹스만 못 읽은 부분 성공: 일반 곡만 먼저 고르고 리믹스는 보류 → 다음 성공 때 리믹스만 이어 붙임", () => {
  const inc = { suno: [A], remix: [C] };
  let s = seedStep(inc, NONE, ok([A, B], false), [], 20);
  assert.deepEqual(s, { picked: [A], done: { suno: true, remix: false } });
  s = seedStep(inc, s.done, ok([A, B, C], true), s.picked, 20);
  assert.deepEqual(s, { picked: [A, C], done: { suno: true, remix: true } });
});

test("손으로 해제한 곡은 되살리지 않고, 복구된 리믹스만 더하며, 20곡 한도를 넘기지 않는다", () => {
  const inc = { suno: [A, B], remix: [C, D] };
  let s = seedStep(inc, NONE, ok([A, B], false), [], 20);
  assert.deepEqual(s.picked, [A, B]);
  s.picked = [B]; // 회원이 A를 해제
  s = seedStep(inc, s.done, ok([A, B, C, D], true), s.picked, 20);
  assert.deepEqual(s.picked, [B, C, D], "A는 다시 고르지 않음");
  const full = Array.from({ length: 19 }, (_, i) => `${String(i).padStart(8, "0")}-1111-1111-1111-111111111111`);
  const capped = seedStep({ suno: [], remix: [C, D] }, { suno: true, remix: false }, ok([...full, C, D]), full, 20); // 19곡이 목록에 있는 선택일 때
  assert.equal(capped.picked.length, 20);
  assert.deepEqual(capped.picked.slice(-1), [C]);
  const again = seedStep(inc, { suno: true, remix: true }, ok([A, B, C, D]), [], 20);
  assert.deepEqual(again.picked, [], "출처마다 한 번 — 다시 불러와도 다시 고르지 않음");
});

test("정상 빈 목록: 성공으로 끝내고(선택 0) 안내는 「0개 찾음」, 오류 안내와 다름", () => {
  const inc = { suno: [A], remix: [C] };
  assert.deepEqual(seedStep(inc, NONE, ok([]), [], 20), { picked: [], done: { suno: true, remix: true } });
  const msg = incomingNotice(inc, ok([]), []);
  assert.match(msg, /보낸 곡 2개 중 0개를 .* 2개는 목록에 없거나/);
  assert.doesNotMatch(msg, /불러오지 못해/);
});

test("받은 곡 안내: 대기·실패·부분 실패(리믹스 「아직」)·수동 해제 뒤 지금 선택 수", () => {
  const inc = { suno: [A, B], remix: [C] };
  assert.equal(incomingNotice({ suno: [], remix: [] }, ok([]), []), null);
  assert.match(incomingNotice(inc, { state: "loading" }, []), /3개를 내 곡 목록에서 찾는 중/);
  assert.match(incomingNotice(inc, { state: "error" }, []), /불러오지 못해 보낸 곡 3개를 아직 선택하지 못했습니다/);
  const partial = incomingNotice(inc, ok([A, B], false), [A, B]);
  assert.match(partial, /3개 중 2개를 .*지금 선택 2개/);
  assert.match(partial, /리믹스 1개는 아직 선택하지 못했습니다/);
  assert.doesNotMatch(partial, /목록에 없거나/, "보류 중인 리믹스를 「없음」으로 세지 않음");
  assert.match(incomingNotice(inc, ok([A, B, C]), [B]), /3개 중 3개를 .*지금 선택 1개/, "손으로 해제");
});

test("응답 역순 경합: 마지막 요청의 응답만 받는다", () => {
  let latest = 0; const first = ++latest, second = ++latest;
  assert.equal(acceptResponse(second, latest), true);
  assert.equal(acceptResponse(first, latest), false, "늦게 도착한 첫 요청 응답은 버림");
});

test("서버·화면 연결: 부분 실패 신호, 요청 번호, 실제 성공에서만 미리 선택, 배경 버튼은 받을 수 있는 변주만", () => {
  const server = readFileSync(new URL("../src/lib/sunoTracks.ts", import.meta.url), "utf8");
  assert.match(server, /music_track_remix_variants\(id, user_id, suno_audio_id, duration_seconds, created_at, audio_url\)/);
  assert.match(server, /remixTrack\(\{[^\n]*\}, \(v\) => !!ownStoragePath\(v\.audio_url \?\? null, base, BUCKET, userId\)\)/);
  assert.match(server, /return \{ tracks: \[\], ok: false \}/);
  assert.match(server, /remixError: !remixes\.ok/);
  const route = readFileSync(new URL("../src/app/api/suno/tracks/route.ts", import.meta.url), "utf8");
  assert.match(route, /NextResponse\.json\(\{ tracks, remixError \}/);
  const ui = readFileSync(new URL("../src/components/video/SunoImportPanel.tsx", import.meta.url), "utf8");
  assert.match(ui, /const id = \+\+reqRef\.current;[\s\S]*if \(!acceptResponse\(id, reqRef\.current\)\) return;[\s\S]*if \(!acceptResponse\(id, reqRef\.current\)\) return;/, "성공·실패 응답 모두 요청 번호 확인");
  assert.match(ui, /setLoadState\("loading"\);/);
  assert.doesNotMatch(ui, /setListError\(""\);\s*\n\s*try/, "대기 시작 때 오류만 지워 빈 목록을 성공처럼 보이게 하지 않음");
  assert.match(ui, /if \(view\.state !== "ok"\) return;\s*\n\s*const r = reconcilePicks\(picked, heldRef\.current, view, knownRemixRef\.current, MAX_PICK\);[^\n]*\n\s*heldRef\.current = r\.held;\s*\n\s*const next = seedStep\(incoming, seedDone, view, r\.picked, MAX_PICK\);/, "성공 응답에서만 정리(활성·보류 분리)·미리 선택");
  assert.doesNotMatch(ui, /setPicked\(uniq\)/);
  assert.match(ui, /disabled=\{!!busy \|\| !!v\.blocked\}/);
  assert.match(ui, /const pickedHere = selectable\.filter/);
  assert.match(ui, /const usable = t\.variants\.find\(\(v\) => !v\.blocked\);/);
  assert.match(ui, /disabled=\{!!busy \|\| !t\.variants\.some\(\(v\) => !v\.blocked\)\} onClick=\{\(\) => void useCover\(t\)\}/);
});

// ── 부분 실패 중 추가 (Master msg_33c8502d9f0d, Mac msg_4abb0464a25e) ──
import { afterAdd, canPickMore, pickedInList } from "../src/lib/remixTracks.ts";

test("부분 실패 중 일반 곡을 먼저 추가해도 보류 중인 리믹스 번호는 남고, 복구되면 리믹스만 미리 선택", () => {
  const inc = { suno: [A], remix: [C] };
  let s = seedStep(inc, NONE, ok([A, B], false), [], 20);
  assert.deepEqual(s, { picked: [A], done: { suno: true, remix: false } });
  // 「선택한 곡 추가」 완료 → 화면은 선택을 비우고 afterAdd로 받은 곡을 정리
  const left = afterAdd(inc, s.done);
  assert.deepEqual(left, { suno: [], remix: [C] }, "처리한 일반 곡만 비움");
  assert.match(incomingNotice(left, ok([A, B], false), []), /보낸 리믹스 1개를 아직 선택하지 못했습니다/);
  // 정상 재조회(리믹스 복구)
  s = seedStep(left, s.done, ok([A, B, C], true), [], 20);
  assert.deepEqual(s, { picked: [C], done: { suno: true, remix: true } }, "추가한 일반 곡은 다시 고르지 않고 리믹스만");
  assert.match(incomingNotice(left, ok([A, B, C], true), s.picked), /보낸 곡 1개 중 1개를 .*지금 선택 1개/);
  // 회원이 리믹스를 해제한 뒤 또 새로고침해도 되살리지 않음
  assert.deepEqual(seedStep(left, s.done, ok([A, B, C], true), [], 20).picked, []);
  assert.deepEqual(afterAdd(left, s.done), { suno: [], remix: [] }, "리믹스까지 처리하면 모두 비움");
});

test("일반 곡만 받은 기존 흐름 회귀: 성공 → 추가 뒤 받은 곡 모두 비움, 같은 응답에서 다시 선택 없음", () => {
  const inc = { suno: [A, B], remix: [] };
  const s = seedStep(inc, NONE, ok([A, B]), [], 20);
  assert.deepEqual(s, { picked: [A, B], done: { suno: true, remix: true } });
  assert.deepEqual(afterAdd(inc, s.done), { suno: [], remix: [] });
});

test("목록에서 사라진 곡은 실제 추가·20곡 한도 계산에서 빠진다", () => {
  const gone = Array.from({ length: 20 }, (_, i) => `${String(i).padStart(8, "0")}-2222-2222-2222-222222222222`);
  assert.deepEqual(pickedInList([...gone, A], [A, B]), [A]);
  assert.equal(canPickMore([...gone, A], [A, B], 20), true, "사라진 20개는 칸을 차지하지 않음");
  assert.equal(canPickMore(gone.slice(0, 19).concat([A]), [...gone.slice(0, 19), A, B], 20), false, "목록에 있는 20개면 막힘");
  const s = seedStep({ suno: [], remix: [C] }, { suno: true, remix: false }, ok([C]), gone, 20);
  assert.ok(s.picked.includes(C), "미리 선택 남은 칸도 목록에 있는 선택만 세서 계산");
});

test("화면 연결: 추가 뒤 afterAdd, 수동 선택 한도는 canPickMore(지금 목록 기준)", () => {
  const ui = readFileSync(new URL("../src/components/video/SunoImportPanel.tsx", import.meta.url), "utf8");
  assert.match(ui, /setIncoming\(\(inc\) => finishAdd\(\[\], inc, targetIds, doneAtStart\)\.incoming\)/);
  assert.doesNotMatch(ui, /setIncoming\(\{ suno: \[\], remix: \[\] \}\)/);
  assert.match(ui, /!canPickMore\(p, selectableIds, MAX_PICK\)/);
  assert.match(ui, /const pickedHere = selectable\.filter/, "실제 추가는 지금 목록에 있는 선택만");
});

// ── 선택 상한·추가 중 경합 (Master msg_e1651a3e0a80, Mac msg_872460738b64) ──
import { finishAdd, prunePicked } from "../src/lib/remixTracks.ts";

const ids = (tag, n) => Array.from({ length: n }, (_, i) => `${String(i).padStart(8, "0")}-${tag}-${tag}-${tag}-${tag}${tag}${tag}`);

test("사라진 선택은 정상 목록에서 정리돼, 다시 나타나도 되살아나지 않는다 — 활성 선택은 항상 20 이하", () => {
  const X = ids("1111", 20), Y = ids("2222", 20), none = new Set();
  let picked = [...X];                                        // 20개 선택
  picked = prunePicked(picked, ok(Y), none, 20);              // X가 사라진 목록 → 정리
  assert.deepEqual(picked, []);
  picked = [...Y];                                            // 다른 20개 선택
  picked = prunePicked(picked, ok([...X, ...Y]), none, 20);   // 두 묶음이 다 보이는 목록
  assert.equal(picked.length, 20);
  assert.deepEqual(picked, Y, "X는 되살아나지 않음");
  assert.equal(prunePicked([...X, ...Y], ok([...X, ...Y]), none, 20).length, 20, "어떤 경로로 40개가 돼도 20으로 자름");
});

test("부분 실패(리믹스 못 읽음)는 진짜 부재와 구분 — 본 적 있는 리믹스 선택은 남기고, 사라진 일반 곡은 정리", () => {
  const known = new Set([C]);
  assert.deepEqual(prunePicked([A, C, B], ok([A], false), known, 20), [A, C], "C는 리믹스라 보류 상태로 유지, B(일반 곡)는 정리");
  assert.deepEqual(prunePicked([A, C], ok([A], true), known, 20), [A], "리믹스까지 정상으로 읽었는데 없으면 정리");
  const same = [A];
  assert.equal(prunePicked(same, ok([A]), known, 20), same, "바뀐 게 없으면 같은 배열(불필요한 갱신 없음)");
  assert.deepEqual(prunePicked([A], { state: "loading" }, known, 20), [A], "대기·실패 중에는 손대지 않음");
  assert.deepEqual(prunePicked([A], { state: "error" }, known, 20), [A]);
});

test("추가 중 경합(순서 바꾼 모의): 새로고침 응답이 추가 도중 도착해 리믹스가 복구·선택돼도 추가 끝에 지워지지 않는다", () => {
  const inc0 = { suno: [A], remix: [C] };
  // 1) 부분 실패 응답 → 일반 곡만 선택
  let s = seedStep(inc0, NONE, ok([A, B], false), [], 20);
  let picked = s.picked, done = s.done, inc = inc0;
  // 2) 「선택한 곡 추가」 클릭: 대상 고정
  const targetIds = new Set(picked), doneAtStart = done;
  // 3) 추가 도중 새로고침 응답 도착(리믹스 복구) → 화면 효과와 같은 순서로 정리·미리 선택
  const view = ok([A, B, C], true);
  picked = seedStep(inc, done, view, prunePicked(picked, view, new Set(), 20), 20).picked;
  done = seedStep(inc, done, view, [], 20).done;
  assert.deepEqual(picked, [A, C]);
  // 4) 추가 완료: 클릭 때 대상만 빼고, 받은 번호는 클릭 때 처리 상태 기준
  const end = finishAdd(picked, inc, targetIds, doneAtStart);
  assert.deepEqual(end.picked, [C], "추가 중 복구된 리믹스 선택 유지");
  assert.deepEqual(end.incoming, { suno: [], remix: [C] }, "리믹스 번호도 유지(안내 계속)");
  // 5) 이후 재조회해도 같은 리믹스를 두 번 고르지 않고, 리믹스까지 추가하면 모두 정리
  assert.deepEqual(seedStep(end.incoming, done, view, end.picked, 20).picked, [C]);
  assert.deepEqual(finishAdd(end.picked, end.incoming, new Set([C]), done), { picked: [], incoming: { suno: [], remix: [] } });
});

test("추가 대상 고정과 회귀: 클릭 때 최대 20개만 처리, 수동 해제·정상 빈 목록 그대로", () => {
  assert.deepEqual(finishAdd([A, B], { suno: [], remix: [] }, new Set([A]), { suno: true, remix: true }).picked, [B], "대상이 아닌 선택(클릭 뒤 고른 곡)은 남김");
  const view = ok([A, B]);
  assert.deepEqual(seedStep({ suno: [A, B], remix: [] }, { suno: true, remix: true }, view, prunePicked([B], view, new Set(), 20), 20).picked, [B], "손으로 해제한 A는 되살리지 않음");
  assert.deepEqual(prunePicked([A], ok([]), new Set(), 20), [], "정상 빈 목록이면 선택도 비움");
  const ui = readFileSync(new URL("../src/components/video/SunoImportPanel.tsx", import.meta.url), "utf8");
  assert.match(ui, /const targets = pickedHere\.slice\(0, MAX_PICK\);/);
  assert.match(ui, /for \(const \[n, \{ t, v, i \}\] of targets\.entries\(\)\)/);
  assert.match(ui, /setPicked\(\(p\) => finishAdd\(p, incoming, targetIds, doneAtStart\)\.picked\)/);
  assert.match(ui, /if \(t\.remix\) for \(const v of t\.variants\) knownRemixRef\.current\.add\(v\.id\);/);
  assert.doesNotMatch(ui, /setBusy\(""\); setPicked\(\[\]\)/, "추가 끝에 선택 전체를 비우지 않음(「선택 해제」 버튼의 전체 해제는 회원 조작이라 별개)");
});

// ── 부분 실패 때 보이는 선택 우선 (Master msg_783c284fa78c, Mac msg_93f223261221) ──
test("숨은 리믹스 20 + 보이는 일반 곡 20: 반복 부분 실패·정상 복구에도 화면에서 고른 20개를 지우지 않는다", () => {
  const R = ids("3333", 20), S = ids("4444", 20), known = new Set(R);
  let picked = [...R];                                                   // 리믹스 20개 선택(정상 목록)
  picked = prunePicked(picked, ok([...R, ...S], true), known, 20);
  assert.deepEqual(picked, R);
  picked = prunePicked(picked, ok(S, false), known, 20);                 // 부분 실패: 리믹스가 숨음 → 보류로 유지
  assert.deepEqual(picked, R);
  assert.equal(canPickMore(picked, S, 20), true, "숨은 선택은 수동 선택 칸을 차지하지 않음");
  picked = [...picked, ...S];                                            // 보이는 일반 곡 20개 직접 선택
  assert.equal(pickedInList(picked, S).length, 20);
  picked = prunePicked(picked, ok(S, false), known, 20);                 // 같은 부분 실패가 한 번 더
  assert.deepEqual(picked, S, "보이는 20개 우선, 숨은 리믹스는 남은 자리(0)만큼만");
  picked = prunePicked(picked, ok(S, false), known, 20);                 // 반복
  assert.deepEqual(picked, S);
  picked = prunePicked(picked, ok([...R, ...S], true), known, 20);       // 정상 복구
  assert.deepEqual(picked, S, "복구돼도 화면 선택 유지, 리믹스는 되살아나지 않음");
  assert.equal(pickedInList(picked, [...R, ...S]).length, 20, "실제 추가 대상 20 이하");
});

test("보이는 선택이 20보다 적으면 숨은 리믹스는 남은 자리에서만 보류", () => {
  const R = ids("5555", 20), known = new Set(R);
  const out = prunePicked([...R, A, B], ok([A, B], false), known, 20);
  assert.deepEqual(out.slice(0, 2), [A, B], "보이는 선택이 앞");
  assert.equal(out.length, 20);
  assert.deepEqual(out.slice(2), R.slice(0, 18), "숨은 리믹스는 18자리만");
  assert.deepEqual(prunePicked([...R, A, B], ok([A, B], true), known, 20), [A, B], "리믹스를 정상으로 읽었는데 없으면 정리");
});

// ── 정상 복구 때 최신 선택 보존 (Master msg_dd4afb1206a0, Mac msg_a2744854458f) — 활성 선택과 일시 보류 분리 ──
import { reconcilePicks } from "../src/lib/remixTracks.ts";

test("즉시 복구 순서: 숨은 옛 리믹스 20 → 지금 곡 20 선택 → 다음 응답 정상 복구 — 지금 선택 20 우선, 옛 리믹스는 남은 자리(0)만", () => {
  const R = ids("6666", 20), S = ids("7777", 20), known = new Set(R);
  let st = reconcilePicks(R, [], ok([...R, ...S], true), known, 20);          // 리믹스 20 선택(정상)
  assert.deepEqual(st, { picked: R, held: [] });
  st = reconcilePicks(st.picked, st.held, ok(S, false), known, 20);            // 부분 실패: 활성에서 빼고 보류로
  assert.deepEqual(st, { picked: [], held: R });
  st = { picked: [...st.picked, ...S], held: st.held };                        // 회원이 지금 곡 20 선택
  st = reconcilePicks(st.picked, st.held, ok([...R, ...S], true), known, 20);  // 곧바로 정상 복구
  assert.deepEqual(st, { picked: S, held: [] }, "지금 선택 유지, 옛 리믹스 되돌릴 자리 없음 → 보류도 비움");
});

test("반복 부분 실패 → 정상 복구: 보류는 남은 자리만큼만, 복구 때 남은 자리에서만 되돌린다", () => {
  const R = ids("8888", 20), known = new Set(R);
  let st = reconcilePicks(R, [], ok([A, B], false), known, 20);
  assert.deepEqual(st, { picked: [], held: R });
  st = reconcilePicks([A, B], st.held, ok([A, B], false), known, 20);          // 지금 곡 2개 선택 뒤 다시 부분 실패
  assert.deepEqual(st.picked, [A, B]);
  assert.deepEqual(st.held, R.slice(0, 18), "보류는 남은 18자리만");
  st = reconcilePicks(st.picked, st.held, ok([A, B], false), known, 20);       // 또 부분 실패
  assert.deepEqual(st, { picked: [A, B], held: R.slice(0, 18) });
  st = reconcilePicks(st.picked, st.held, ok([A, B, ...R], true), known, 20);  // 정상 복구
  assert.deepEqual(st, { picked: [A, B, ...R.slice(0, 18)], held: [] });
  assert.ok(st.picked.length <= 20);
});

test("수동 해제·상한: 해제한 지금 곡은 되살리지 않고, 복구된 보류가 목록에 없으면 버리며, 활성은 항상 20 이하", () => {
  const known = new Set([C, D]);
  let st = reconcilePicks([A, C], [], ok([A, B], false), known, 20);
  assert.deepEqual(st, { picked: [A], held: [C] });
  st = reconcilePicks([], st.held, ok([A, B], false), known, 20);              // 회원이 A 해제
  assert.deepEqual(st, { picked: [], held: [C] });
  st = reconcilePicks(st.picked, st.held, ok([A, B, D], true), known, 20);     // 복구됐지만 C는 이제 목록에 없음
  assert.deepEqual(st, { picked: [], held: [] }, "A 되살림 없음, 없는 C는 버림");
  const many = ids("9999", 30);
  assert.equal(reconcilePicks(many, [], ok(many, true), new Set(), 20).picked.length, 20);
  assert.deepEqual(reconcilePicks([A], [C], { state: "loading" }, known, 20), { picked: [A], held: [C] }, "대기 중엔 그대로");
});

// ── 「선택 해제」 뒤 보류 복원 방지 (Master msg_0757c1fe635b, Mac msg_b8734f097704) — 화면 효과와 같은 순서(reconcile → seedStep) ──
import { clearSelection } from "../src/lib/remixTracks.ts";

/** 화면 효과 한 번 — 정상 목록 응답을 받았을 때 */
function onList(st, view) {
  const r = reconcilePicks(st.picked, st.held, view, st.known, 20);
  const next = seedStep(st.incoming, st.done, view, r.picked, 20);
  return { ...st, picked: next.picked, held: r.held, done: next.done };
}
const cleared = (st) => ({ ...st, ...clearSelection() });

test("부분 실패 중 활성 5 + 보류 15에서 「선택 해제」 → 해제 뒤 도착한 정상 응답에서도 되살리지 않음", () => {
  const R = ids("aaaa", 15), G = ids("bbbb", 5), known = new Set(R);
  let st = { picked: [...R, ...G], held: [], incoming: { suno: [], remix: [] }, done: { suno: true, remix: true }, known };
  st = onList(st, ok(G, false));                                      // 부분 실패: 리믹스 15는 보류
  assert.deepEqual([st.picked, st.held], [G, R]);
  st = cleared(st);                                                     // 회원이 「선택 해제」
  assert.deepEqual([st.picked, st.held], [[], []]);
  st = onList(st, ok([...R, ...G], true));                              // 해제 전에 보낸 새로고침의 정상 응답이 뒤늦게 도착
  assert.deepEqual([st.picked, st.held], [[], []], "리믹스 15 되살림 없음");
});

test("처리 전 받은 리믹스 번호도 해제 — 부분 실패 반복 뒤 정상 복구돼도 미리 선택하지 않음", () => {
  let st = { picked: [], held: [], incoming: { suno: [A], remix: [C] }, done: NONE, known: new Set() };
  st = onList(st, ok([A, B], false));                                   // 일반 곡 A만 선택, 리믹스 C 보류(받은 번호)
  assert.deepEqual(st.picked, [A]);
  assert.equal(st.done.remix, false);
  st = cleared(st);
  assert.deepEqual(st.incoming, { suno: [], remix: [] });
  st = onList(st, ok([A, B], false));                                   // 부분 실패 반복
  st = onList(st, ok([A, B, C], true));                                 // 정상 복구
  assert.deepEqual(st.picked, [], "A·C 모두 되살리지 않음");
  assert.equal(incomingNotice(st.incoming, ok([A, B, C], true), st.picked), null, "받은 곡 안내도 사라짐");
});

test("일반 곡(?suno=)만 쓰는 흐름 회귀: 해제 뒤 응답이 와도 그대로 비어 있고, 다시 손으로 고르면 정상 선택", () => {
  let st = { picked: [], held: [], incoming: { suno: [A, B], remix: [] }, done: NONE, known: new Set() };
  st = onList(st, ok([A, B]));
  assert.deepEqual(st.picked, [A, B]);
  st = cleared(st);
  st = onList(st, ok([A, B]));
  assert.deepEqual(st.picked, []);
  assert.equal(canPickMore(st.picked, [A, B], 20), true);
  st = onList({ ...st, picked: [B] }, ok([A, B]));
  assert.deepEqual(st.picked, [B], "해제 뒤 손으로 고른 곡은 유지");
});

test("화면 연결: 「선택 해제」는 clearAll(활성·보류·받은 곡·완료 표시) — 보류나 받은 곡만 남아도 누를 수 있음", () => {
  const ui = readFileSync(new URL("../src/components/video/SunoImportPanel.tsx", import.meta.url), "utf8");
  assert.match(ui, /const clearAll = \(\) => \{ const c = clearSelection\(\); setPicked\(c\.picked\); heldRef\.current = c\.held; setIncoming\(c\.incoming\); setSeedDone\(c\.done\); \};/);
  assert.match(ui, /onClick=\{clearAll\}>선택 해제<\/button>/);
  assert.doesNotMatch(ui, /onClick=\{\(\) => setPicked\(\[\]\)\}/);
  assert.match(ui, /disabled=\{!!busy \|\| \(!picked\.length && !heldRef\.current\.length && !incoming\.suno\.length && !incoming\.remix\.length\)\} onClick=\{clearAll\}/);
});
