// v1.48 대본·후보 행 30일 정리(2026-11-11 주인님 최종: 일반 회원은 발행 여부와 상관없이 30일, 관리자·시험·저장 구독 회원은 retention_exempt로 제외).
// 대본(shorts_videos)은 마지막 수정일 기준 — 장면을 최근에 고쳤으면 대본도 살아 있는 것으로 본다(지금 작업 중인 대본 보호).
// 후보(shorts_candidates)는 남아 있는 대본이 가리키고 있으면 지우지 않는다. 순수 함수(시험: tests/retentionRows.test.mjs).
export const ROW_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** 이 시각보다 오래 손대지 않은 행이 정리 대상 */
export function rowCutoffIso(now: number): string {
  return new Date(now - ROW_TTL_MS).toISOString();
}

export interface VideoRow { id: string; user_id: string; updated_at: string; candidate_id?: string | null }
export interface SegmentStamp { video_id: string; updated_at: string }

/** 지울 대본: 대본·장면 모두 기준 시각보다 오래됐고 예외 회원이 아님 */
export function pickExpiredVideos(videos: VideoRow[], segments: SegmentStamp[], cutoffIso: string, exempt: Set<string>): VideoRow[] {
  const fresh = new Set(segments.filter((s) => s.updated_at >= cutoffIso).map((s) => s.video_id));
  return videos.filter((v) => v.updated_at < cutoffIso && !exempt.has(v.user_id) && !fresh.has(v.id));
}

export interface CandidateRow { id: string; user_id: string; updated_at: string }

/** 지울 후보: 오래됐고 예외 회원이 아니며 남아 있는 대본이 쓰지 않음 */
export function pickExpiredCandidates(candidates: CandidateRow[], inUse: Set<string>, cutoffIso: string, exempt: Set<string>): CandidateRow[] {
  return candidates.filter((c) => c.updated_at < cutoffIso && !exempt.has(c.user_id) && !inUse.has(c.id));
}

/** 우리 저장소(shots-bgm) 공개 주소면 버킷 안 경로, 외부 임시 주소면 null */
export function bgmStoragePath(url: string | null | undefined): string | null {
  const m = url?.match(/\/storage\/v1\/object\/public\/shots-bgm\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}
