// 리믹스 변주를 가사 영상에 보여 줄 때의 가사 글·안내·시간 가사 작업 번호 — 순수 함수(2026-11-20 리믹스 가사 1차).
// 설계: music/docs/PLAN_20261120_REMIX_LYRICS_PERSISTENCE.md 0-5·1차 인계표 B1~B3·인수 K1~K4.
// 같은 폴더 모듈을 불러오지 않는다(Node 시험은 .ts 확장자가 필요하고 tsc는 막음) — 가사 선택 함수는 호출부가 넘긴다(remixLyrics.ts의 pickRemixLyricText).

type RemixLyricsStatus = "provided_unverified" | "empty" | "not_applicable" | "unknown";
export type PickRemixLyricText = (memberLyrics: string | null, variant: { status: RemixLyricsStatus; lyrics: string | null }) => { source: "member" | "suno_unverified" | "none"; text: string | null; notice: string | null };

export interface RemixRowForView {
  task_id: string | null;
  mode: string;
  lyrics: string | null; // 회원 원문
  instrumental: boolean;
  extend_hop_count: number | null; // K1: 구형 DB에서도 읽음(0011 이후 항상 있음)
}

export interface RemixVariantRowForView {
  suno_audio_id: string | null;
  suno_task_id?: string | null; // 새 칸 — 구형 DB에서는 없음
  lyrics?: string | null;
  lyrics_status?: string | null;
}

export const REMIX_TIMED_BLOCKED = "이 곡은 시간 가사를 받을 수 없습니다(연장된 리믹스의 예전 곡). 가사 글로 넣고 싱크 화면에서 맞춰 주세요.";

const STATUSES: RemixLyricsStatus[] = ["provided_unverified", "empty", "not_applicable", "unknown"];

export interface RemixVariantView {
  vocal: boolean;
  lyricText: string; // 가사 글(없으면 "")
  lyricsNotice: string | null; // K4: Suno 미검증 가사로 실제 채웠을 때만
  timedTaskId: string | null; // 시간 가사 요청 작업 번호(없으면 요청하지 않음)
  timedBlockedReason: string | null; // 보컬인데 작업 번호를 믿을 수 없어 막은 경우의 안내
}

export function remixVariantView(remix: RemixRowForView, variant: RemixVariantRowForView, pickRemixLyricText: PickRemixLyricText): RemixVariantView {
  const vocal = !remix.instrumental && remix.mode !== "add_instrumental";
  if (!vocal) return { vocal, lyricText: "", lyricsNotice: null, timedTaskId: null, timedBlockedReason: null };

  // 가사 글 — 회원 원문 > Suno 미검증 가사(확인 안내) > 없음. 상태 칸이 없거나 모르는 값이면 unknown으로
  const raw = variant.lyrics_status ?? "unknown";
  const status: RemixLyricsStatus = (STATUSES as string[]).includes(raw) ? (raw as RemixLyricsStatus) : "unknown";
  const pick = pickRemixLyricText(remix.lyrics, { status, lyrics: variant.lyrics ?? null });
  const lyricText = pick.text ?? "";
  const lyricsNotice = pick.source === "suno_unverified" ? pick.notice : null;

  // 시간 가사 작업 번호(K2) — 변주 자신의 번호, 없으면 연장한 적 없는 리믹스(hop 0)만 부모 번호, 그 밖은 호출 전에 막음
  const own = typeof variant.suno_task_id === "string" && variant.suno_task_id ? variant.suno_task_id : null;
  let timedTaskId: string | null = null;
  let timedBlockedReason: string | null = null;
  if (!variant.suno_audio_id) {
    timedTaskId = null;
  } else if (own) {
    timedTaskId = own;
  } else if ((remix.extend_hop_count ?? 0) === 0 && remix.extend_hop_count !== null) {
    timedTaskId = remix.task_id;
  } else {
    timedBlockedReason = REMIX_TIMED_BLOCKED;
  }
  return { vocal, lyricText, lyricsNotice, timedTaskId, timedBlockedReason };
}
