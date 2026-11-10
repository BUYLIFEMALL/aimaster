// 영상 합치기 배경음악 — 「내 자료함」(공용 member-assets-client) 곡을 화면용으로 바꾸는 순수 함수(v1.35, 2026-11-11).
// 플랜 docs/PLAN_20261111_MEMBER_LIBRARY_MUSIC.md. 서버 전용 코드를 부르지 않는다(시험·화면 공용).
import { isLibraryRef } from "./timeline";
export { isLibraryRef };

/** 자료함 곡을 만든 프로그램 이름 */
export const SONG_SOURCE_LABELS: Record<string, string> = {
  "ai-music-studio": "AI 음악 스튜디오",
  "music-automation": "Suno 음악 자동화",
  "free-music-studio": "무료음악",
};

export interface LibrarySong {
  /** 저장할 값 — member_assets의 sourceRef(원본 표:원본 번호:순번) */
  ref: string;
  title: string;
  source: string;
  durationS: number | null;
  url: string | null;
  /** 음원이 회원 PC에만 있음(무료음악) — 여기서는 고를 수 없음 */
  localOnly: boolean;
  /** 외부 임시 주소(Suno) — 약 14일 뒤 재생이 안 될 수 있음 */
  external: boolean;
}

type AssetLike = { sourceRef: string; sourceSlug: string; title: string; durationS: number | null; playUrl: string | null; localOnly: boolean; external: boolean };

export function toLibrarySongs(assets: AssetLike[]): LibrarySong[] {
  return assets
    .filter((a) => isLibraryRef(a.sourceRef))
    .map((a) => ({
      ref: a.sourceRef,
      title: (a.title || "제목 없음").slice(0, 80),
      source: SONG_SOURCE_LABELS[a.sourceSlug] ?? a.sourceSlug,
      durationS: a.durationS,
      url: a.localOnly ? null : a.playUrl,
      localOnly: a.localOnly,
      external: a.external,
    }));
}

/** 배경음악 파일 상한(예전 AI 음악 스튜디오 목록과 같은 30MB) — 받기 전 Content-Length로 확인 */
export const MAX_SONG_BYTES = 30 * 1024 * 1024;
