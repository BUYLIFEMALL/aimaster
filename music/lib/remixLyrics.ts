// 리믹스 가사 보존 1차 — 순수 함수만(REMIX-LYRICS-PHASE1-PURE A1·A2, 2026-11-20 Master msg_96c9c3d1f5fa·msg_c0d595790bfa).
// 설계: docs/PLAN_20261120_REMIX_LYRICS_PERSISTENCE.md 0절(통일 계약), 표본 docs/fixtures/remix-lyrics-fixtures-20261120.json.
// 아직 어디에도 연결하지 않는다(콜백·DB·저장·화면 없음). 실제 record-info 응답에 `prompt`가 있는지·무엇을 뜻하는지는 미확인이라
// 문서상 후보(`prompt`)에서 받은 가사는 항상 「미검증(provided_unverified)」으로만 표시한다.

export type RemixLyricsStatus = "provided_unverified" | "empty" | "not_applicable" | "unknown";

/** 저장 상한 — 유니코드 코드 포인트 수 기준(UTF-16 길이가 아님). 이모지 같은 서로게이트 쌍을 반으로 자르지 않는다. */
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
  lyrics: string | null; // provided_unverified일 때만 값(코드 포인트 5,000 이하)
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

/**
 * 비교용 정규화(명시 규칙, 이 순서): ① NFC ② 구간 표시 `[...]` 제거 ③ 글자·숫자·공백이 아닌 문자(문장부호·기호) 제거
 * ④ 모든 공백(줄바꿈 포함)을 공백 하나로 ⑤ 앞뒤 공백 제거 ⑥ 소문자.
 */
export function normalizeForCompare(s: string): string {
  return s
    .normalize("NFC")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** 돌려받은 글이 정규화 뒤 우리 지시문 후보 하나와 **전문이 똑같을 때만** true. 앞부분·일부 일치·가사와 섞임은 false. */
export function isInstructionEcho(returned: string, candidates: string[]): boolean {
  const r = normalizeForCompare(returned);
  if (!r) return false;
  return candidates.some((c) => r === normalizeForCompare(c));
}

/** 코드 포인트 기준으로 자른다 — 서로게이트 쌍을 가르지 않는다. */
export function truncateCodePoints(s: string, max: number): string {
  const cps = Array.from(s);
  return cps.length > max ? cps.slice(0, max).join("") : s;
}

export function codePointLength(s: string): number {
  return Array.from(s).length;
}

const HANGUL = /[ㄱ-ㆎ가-힣]/;
const LATIN = /[A-Za-z]/;

function hasOwn(o: object, k: string): boolean {
  return Object.prototype.hasOwnProperty.call(o, k);
}

/** 내부용: 자르기 전 원문까지 함께 돌려준다(같은 번호 충돌 판정은 원문으로 해야 하므로). */
function classifyWithRaw(ctx: RemixLyricsContext, item: unknown): RemixLyricsResult & { raw: string | null } {
  const obj = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
  const guessedFieldSeen = GUESSED_LYRIC_FIELDS.some((k) => hasOwn(obj, k));
  const base = { guessedFieldSeen, suspectLanguage: false };
  if (ctx.instrumental || ctx.mode === "add_instrumental") return { status: "not_applicable", lyrics: null, raw: null, ...base };
  if (!hasOwn(obj, "prompt") || typeof obj.prompt !== "string") return { status: "unknown", lyrics: null, raw: null, ...base };
  const raw = obj.prompt;
  if (!raw.trim()) return { status: "empty", lyrics: null, raw, ...base };
  const hasUserLyrics = !!ctx.userLyrics && !!ctx.userLyrics.trim();
  if (!hasUserLyrics && isInstructionEcho(raw, remixInstructionCandidates(ctx.lang, ctx.vocalGender))) {
    return { status: "empty", lyrics: null, raw, ...base };
  }
  const lyrics = truncateCodePoints(raw, REMIX_LYRICS_MAX);
  const suspectLanguage = ctx.lang === "한국어" && !HANGUL.test(lyrics) && LATIN.test(lyrics);
  return { status: "provided_unverified", lyrics, raw, guessedFieldSeen, suspectLanguage };
}

/** 항목 하나(sunoData 원소)의 가사 상태 — 0-2 판정 */
export function classifyRemixLyrics(ctx: RemixLyricsContext, item: unknown): RemixLyricsResult {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { raw, ...result } = classifyWithRaw(ctx, item);
  return result;
}

export interface RemixLyricsMatchRow extends RemixLyricsResult {
  audioId: string;
  matched: boolean; // 응답에 이 오디오 번호가 있었는지
  conflict: boolean; // 같은 번호가 서로 다른 원문(또는 다른 상태)으로 여러 번 왔음
}

/**
 * 곡별 오디오 번호로만 짝을 짓는다(배열 순서 무시). 번호가 없는 항목은 어떤 곡에도 매칭하지 않는다.
 * 같은 번호가 여러 번 오면 **자르기 전 원문**과 상태가 모두 같을 때만 하나로 인정하고,
 * 하나라도 다르면(5,000자 뒤에서만 달라도) 어느 것도 고르지 않고 unknown + conflict.
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
  const notApplicable = ctx.instrumental || ctx.mode === "add_instrumental";
  const rows = audioIds.map((audioId): RemixLyricsMatchRow => {
    const list = groups.get(audioId);
    if (!list) {
      return { audioId, matched: false, conflict: false, status: notApplicable ? "not_applicable" : "unknown", lyrics: null, guessedFieldSeen: false, suspectLanguage: false };
    }
    const results = list.map((it) => classifyWithRaw(ctx, it));
    const first = results[0];
    const guessedFieldSeen = results.some((r) => r.guessedFieldSeen);
    const same = results.every((r) => r.status === first.status && r.raw === first.raw);
    if (!same) {
      return { audioId, matched: true, conflict: true, status: notApplicable ? "not_applicable" : "unknown", lyrics: null, guessedFieldSeen, suspectLanguage: false };
    }
    return { audioId, matched: true, conflict: false, status: first.status, lyrics: first.lyrics, guessedFieldSeen, suspectLanguage: first.suspectLanguage };
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
