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
import { REMIX_NOT_STORED, incomingNotice, seedSelection } from "../src/lib/remixTracks.ts";

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

test("미리 선택: 받은 순서·고를 수 있는 곡만·최대 개수", () => {
  assert.deepEqual(seedSelection([C, A, B], [A, C], 20), [C, A], "B(목록에 없거나 받을 수 없음)는 빠짐");
  assert.deepEqual(seedSelection([A, B, C], [A, B, C], 2), [A, B]);
  assert.deepEqual(seedSelection([A], [], 20), []);
});

test("받은 곡 안내: 찾는 중 → 오류(선택 안 함) → 정상(찾은 수·지금 선택 수) — 손으로 해제·다시 불러오기 뒤에도 지금 상태와 일치", () => {
  assert.equal(incomingNotice([], null, []), null);
  assert.match(incomingNotice([A, B], null, []), /2개를 내 곡 목록에서 찾는 중/);
  assert.match(incomingNotice([A, B], { ok: false }, []), /불러오지 못해 보낸 곡 2개를 아직 선택하지 못했습니다/);
  const all = incomingNotice([A, B], { ok: true, selectable: [A, B, C] }, [A, B]);
  assert.match(all, /보낸 곡 2개 중 2개를 .*지금 선택 2개/);
  assert.doesNotMatch(all, /선택하지 못했습니다/);
  assert.match(incomingNotice([A, B], { ok: true, selectable: [A, B] }, [A]), /2개 중 2개를 .*지금 선택 1개/, "손으로 하나 해제");
  const miss = incomingNotice([A, B, C], { ok: true, selectable: [A] }, [A]);
  assert.match(miss, /3개 중 1개를 .*지금 선택 1개.* 2개는 목록에 없거나 음원이 저장되지 않아/);
  assert.match(incomingNotice([A, B, C], { ok: true, selectable: [A, B, C] }, [A]), /3개 중 3개를 .*지금 선택 1개/, "다시 불러와 더 찾으면 찾은 수는 늘고 선택 수는 실제대로");
});

test("서버·화면 연결: 리믹스 목록은 음원 저장 여부로 blocked, 화면은 처음 정상 로드 때만 미리 선택·blocked는 체크 불가", () => {
  const server = readFileSync(new URL("../src/lib/sunoTracks.ts", import.meta.url), "utf8");
  assert.match(server, /music_track_remix_variants\(id, user_id, suno_audio_id, duration_seconds, created_at, audio_url\)/);
  assert.match(server, /remixTrack\(\{[^\n]*\}, \(v\) => !!ownStoragePath\(v\.audio_url \?\? null, base, BUCKET, userId\)\)/);
  const ui = readFileSync(new URL("../src/components/video/SunoImportPanel.tsx", import.meta.url), "utf8");
  assert.match(ui, /if \(seeded \|\| !incoming\.length \|\| !list \|\| listError\) return;/, "오류·미로드·이미 선택했으면 미리 선택 안 함");
  assert.doesNotMatch(ui, /setPicked\(uniq\)/, "주소를 읽자마자 선택하지 않음");
  assert.match(ui, /disabled=\{!!busy \|\| !!v\.blocked\}/);
  assert.match(ui, /const pickedHere = selectable\.filter/, "추가 대상에서도 blocked 제외");
});
