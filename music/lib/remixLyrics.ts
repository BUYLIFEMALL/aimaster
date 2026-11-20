// 리믹스 가사 보존 1차 — 순수 함수만(REMIX-LYRICS-PHASE1-PURE A1, 2026-11-20 Master msg_96c9c3d1f5fa).
// 설계: docs/PLAN_20261120_REMIX_LYRICS_PERSISTENCE.md 0절(통일 계약), 표본 docs/fixtures/remix-lyrics-fixtures-20261120.json.
// 아직 어디에도 연결하지 않는다(콜백·DB·저장·화면 없음). 실제 record-info 응답에 `prompt`가 있는지·무엇을 뜻하는지는 미확인이라
// 문서상 후보(`prompt`)에서 받은 가사는 항상 「미검증(provided_unverified)」으로만 표시한다.

export type RemixLyricsStatus = "provided_unverified" | "empty" | "not_applicable" | "unknown";

export const REMIX_LYRICS_MAX = 5000;

/** 문서에 없는, 추측으로만 떠올린 가사 칸 이름 — 이 칸의 문자열은 가사로 쓰지 않는다(진단 표시만). */
export const GUESSED_LYRIC_FIELDS = ["lyrics", "lyric"] as const;

export interface RemixLyricsContext {
  mode: string; // cover · add_vocals · add_instrumental · mashup
  instrumental: boolean;
  userLyrics: string | null; // music_track_remixes.lyrics(회원이 직접 넣은 가사)
  lang: string; // music_track_remixes.lang(예: 한국어)
  vocalGender: string | null; // 여성 · 남성 · 혼성
}

export interface RemixLyricsResult {
  status: RemixLyricsStatus;
  lyrics: string | null; // provided_unverified일 때만 값
  guessedFieldSeen: boolean;
  suspectLanguage: boolean; // 한국어 리믹스인데 한글 없이 영어만 — 자동으로 상태를 바꾸지 않고 표시만
}

/**
 * 우리가 Suno에 보내는 영어 지시문 후보. 원문은 lib/actions/remix.ts `buildDefaultRemixPrompt`와
 * lib/remixSync.ts `buildExtendContinuationPrompt` — 시험(tests/remixLyrics.test.mjs)이 두 파일의 문구와 같은지 확인한다.
 */
export function remixInstructionCandidates(lang: string, vocalGender: string | null): string[] {
  const solo = `Sing this song in ${lang}, in the new style described above, keeping the same emotional theme and story as the original.`;
  const duet = `${solo} Alternate between male and female vocals across different sections (verses and chorus), like a duet.`;
  const extend = `Continue this remix naturally into a new section that fits the same style and mood as before, written in ${lang}.`;
  const extendDuet = `${extend} Keep alternating between male and female vocals as a duet.`;
  return vocalGender === "혼성" ? [duet, solo, extendDuet, extend] : [solo, duet, extend, extendDuet];
}

/** 비교용 정규화 — 구간 표시([Verse] 등)·문장부호 제거, 공백 하나로, 소문자, NFC */
export function normalizeForCompare(s: string): string {
  return s
    .normalize("NFC")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** 돌려받은 글이 우리 지시문 그대로이거나 지시문 첫 구절로 시작하면 true */
export function isInstructionEcho(returned: string, candidates: string[]): boolean {
  const r = normalizeForCompare(returned);
  if (!r) return false;
  for (const c of candidates) {
    const full = normalizeForCompare(c);
    // 첫 구절 = 정규화한 앞 다섯 단어(일반 지시문은 「sing this song in <언어>」, 연장 지시문은 「continue this remix naturally into」)
    const head = full.split(" ").slice(0, 5).join(" ");
    if (r === full || (head.length >= 12 && r.startsWith(head))) return true;
  }
  return false;
}

const HANGUL = /[ㄱ-ㆎ가-힣]/;
const LATIN = /[A-Za-z]/;

function hasOwn(o: object, k: string): boolean {
  return Object.prototype.hasOwnProperty.call(o, k);
}

/** 항목 하나(sunoData 원소)의 가사 상태 — 0-2 판정 */
export function classifyRemixLyrics(ctx: RemixLyricsContext, item: unknown): RemixLyricsResult {
  const obj = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
  const guessedFieldSeen = GUESSED_LYRIC_FIELDS.some((k) => hasOwn(obj, k));
  const base = { guessedFieldSeen, suspectLanguage: false };
  if (ctx.instrumental || ctx.mode === "add_instrumental") return { status: "not_applicable", lyrics: null, ...base };
  if (!hasOwn(obj, "prompt") || typeof obj.prompt !== "string") return { status: "unknown", lyrics: null, ...base };
  const raw = obj.prompt;
  if (!raw.trim()) return { status: "empty", lyrics: null, ...base };
  const hasUserLyrics = !!ctx.userLyrics && !!ctx.userLyrics.trim();
  if (!hasUserLyrics && isInstructionEcho(raw, remixInstructionCandidates(ctx.lang, ctx.vocalGender))) {
    return { status: "empty", lyrics: null, ...base };
  }
  const lyrics = raw.length > REMIX_LYRICS_MAX ? raw.slice(0, REMIX_LYRICS_MAX) : raw;
  const suspectLanguage = ctx.lang === "한국어" && !HANGUL.test(lyrics) && LATIN.test(lyrics);
  return { status: "provided_unverified", lyrics, guessedFieldSeen, suspectLanguage };
}

export interface RemixLyricsMatchRow extends RemixLyricsResult {
  audioId: string;
  matched: boolean; // 응답에 이 오디오 번호가 정확히 하나의 뜻으로 있었는지
  conflict: boolean; // 같은 번호가 서로 다른 가사로 여러 번 왔음
}

/**
 * 곡별 오디오 번호로만 짝을 짓는다(배열 순서 무시). 번호가 없는 항목은 어떤 곡에도 매칭하지 않는다.
 * 같은 번호가 같은 가사로 여러 번 오면 하나로, 서로 다르면 어느 것도 고르지 않고 unknown + conflict.
 */
export function matchRemixLyricsByAudioId(
  ctx: RemixLyricsContext,
  items: unknown[],
  audioIds: string[],
): { rows: RemixLyricsMatchRow[]; ignoredWithoutId: number; duplicateIds: string[] } {
  const groups = new Map<string, unknown[]>();
  let ignoredWithoutId = 0;
  for (const it of Array.isArray(items) ? items : []) {
    const id = it && typeof it === "object" ? (it as Record<string, unknown>).id : undefined;
    if (typeof id !== "string" || !id.trim()) {
      ignoredWithoutId++;
      continue;
    }
    const list = groups.get(id) ?? [];
    list.push(it);
    groups.set(id, list);
  }
  const duplicateIds = [...groups].filter(([, l]) => l.length > 1).map(([id]) => id);
  const rows = audioIds.map((audioId): RemixLyricsMatchRow => {
    const list = groups.get(audioId);
    if (!list) {
      return { audioId, matched: false, conflict: false, status: ctx.instrumental || ctx.mode === "add_instrumental" ? "not_applicable" : "unknown", lyrics: null, guessedFieldSeen: false, suspectLanguage: false };
    }
    const results = list.map((it) => classifyRemixLyrics(ctx, it));
    const first = results[0];
    const same = results.every((r) => r.status === first.status && r.lyrics === first.lyrics);
    if (!same) {
      return { audioId, matched: true, conflict: true, status: "unknown", lyrics: null, guessedFieldSeen: results.some((r) => r.guessedFieldSeen), suspectLanguage: false };
    }
    return { audioId, matched: true, conflict: false, ...first, guessedFieldSeen: results.some((r) => r.guessedFieldSeen) };
  });
  return { rows, ignoredWithoutId, duplicateIds };
}

export type RemixLyricSource = "member" | "suno_unverified" | "none";

/** 소비처(가사 영상 본문) 우선순위 — 회원 원문 > Suno 미검증 가사(확인 안내) > 없음(붙여 넣기 안내) */
export function pickRemixLyricText(
  memberLyrics: string | null,
  variant: { status: RemixLyricsStatus; lyrics: string | null },
): { source: RemixLyricSource; text: string | null; notice: string | null } {
  if (memberLyrics && memberLyrics.trim()) return { source: "member", text: memberLyrics, notice: null };
  if (variant.status === "not_applicable") return { source: "none", text: null, notice: null };
  if (variant.status === "provided_unverified" && variant.lyrics && variant.lyrics.trim()) {
    return { source: "suno_unverified", text: variant.lyrics, notice: "Suno가 준 가사입니다 — 확인해 주세요" };
  }
  return { source: "none", text: null, notice: "가사를 붙여 넣어 주세요" };
}
