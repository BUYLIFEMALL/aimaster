// v1.46 AI 무료음악 자동화 「모든 음악 › 이미지 스토리 쇼츠 배경음악으로」 받는 쪽(백로그 D-6) — 화면·서버가 함께 쓰는 순수 함수.
// 음원은 회원 PC 엔진에만 있어 무료음악 창이 postMessage로 건네준다(서버를 거치지 않음).
// 순서: 받기 화면(/fms-bgm#fms=<곡 번호>) → 「shs-ready」 → 무료음악 창 → 「fms-audio」({ id, name, blob })
//       → 회원이 넣을 영상을 고름 → 일회용 주소로 shots-bgm `<회원 id>/<영상 id>-fms-<uuid>.mp3`에 바로 올림 → 그 영상의 배경음악 곡으로 저장·선택.
// 이 프로그램은 교차 출처 격리 헤더가 없어 window.opener가 그대로 살아 있다(쇼츠 원스톱 D-4와 다른 점).
// 계약 문서: free-music-studio/docs/HANDOFF_20261109_SHORTS_BGM_FROM_FMS.md
export const FMS_ORIGINS = ["https://free-music-studio.buylife.xyz", "https://free-music-studio.vercel.app"];
export const FMS_READY_TYPE = "shs-ready";
export const FMS_WAIT_MS = 180_000;
export const FMS_MAX_BYTES = 15 * 1024 * 1024;
const EXT = /\.(mp3|m4a|wav|ogg|aac)$/i;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** 주소 #fms=<곡 번호>(또는 ?fms=) 읽기 */
export function fmsTrackId(hashOrSearch: string): string | null {
  return new RegExp(`^[#?]fms=(${UUID})$`, "i").exec(hashOrSearch)?.[1] ?? null;
}

/** 받은 파일 이름 정리 — 파일에 쓸 수 없는 글자 제거, 확장자 없으면 .mp3 */
export function fmsFileName(raw: string | undefined): string {
  const base = (raw || "무료음악").replace(/[\\/:*?"<>|]/g, "").trim().slice(0, 80) || "무료음악";
  return EXT.test(base) ? base : `${base}.mp3`;
}

/** 곡 제목(확장자 뺀 이름) */
export const fmsTitle = (fileName: string) => fileName.replace(EXT, "").slice(0, 120) || "무료음악";

export function fmsContentType(fileName: string): string {
  const ext = (EXT.exec(fileName)?.[1] ?? "mp3").toLowerCase();
  return ext === "mp3" ? "audio/mpeg" : ext === "m4a" || ext === "aac" ? "audio/mp4" : `audio/${ext}`;
}

/** 저장 경로 — 회원 폴더 안, 영상 번호로 시작(기존 배경음악 곡과 같은 규칙) */
export function fmsBgmPath(userId: string, videoId: string, id: string, fileName: string): string {
  const ext = (EXT.exec(fileName)?.[1] ?? "mp3").toLowerCase();
  return `${userId}/${videoId}-fms-${id}.${ext}`;
}

/** 이 회원·이 영상의 받기 경로인가(서버가 완료 단계에서 남의 경로를 막는 데 쓴다) */
export function isOwnFmsBgmPath(path: string, userId: string, videoId: string): boolean {
  return new RegExp(`^${userId}/${videoId}-fms-${UUID}\\.(mp3|m4a|wav|ogg|aac)$`, "i").test(path);
}
