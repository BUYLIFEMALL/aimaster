// v1.46 AI 무료음악 자동화 「쇼츠 배경음악으로」 — 받는 쪽 공용 값(받기 화면 /fms-bgm 과 렌더 화면이 함께 쓴다).
// 음원은 회원 PC 엔진에만 있어 무료음악 창이 postMessage로 건네준다. 렌더 화면(/render)은 무료 음성 빠른 계산 때문에
// 교차 출처 격리(COOP same-origin) 헤더가 있어 다른 출처가 연 창의 window.opener가 끊기므로, 받기는 헤더를 뺀 /fms-bgm 이 맡고
// 올린 결과({ path, name })만 sessionStorage로 /render 에 넘긴다(free-music-studio/docs/HANDOFF_20261109_SHORTS_BGM_FROM_FMS.md 11~12절).
export const FMS_ORIGINS = ["https://free-music-studio.buylife.xyz", "https://free-music-studio.vercel.app"];
export const FMS_WAIT_MS = 180_000;
export const FMS_MAX_BYTES = 15 * 1024 * 1024; // /api/media/bgm 상한과 같게
const KEY = "sos-fms-bgm";

export interface FmsBgm { path: string; name: string }

/** 주소 #fms=<곡 번호> 읽기 */
export function fmsTrackId(hash: string): string | null {
  return /^#fms=([0-9a-f-]{36})$/i.exec(hash)?.[1] ?? null;
}

/** 받은 파일 이름 정리 — 파일에 쓸 수 없는 글자 제거, 확장자 없으면 .mp3 */
export function fmsFileName(raw: string | undefined): string {
  const base = (raw || "무료음악").replace(/[\\/:*?"<>|]/g, "").trim().slice(0, 80) || "무료음악";
  return /\.(mp3|m4a|wav|ogg|aac)$/i.test(base) ? base : `${base}.mp3`;
}

export function saveFmsBgm(v: FmsBgm): boolean {
  try { sessionStorage.setItem(KEY, JSON.stringify(v)); return true; } catch { return false; }
}

/** 한 번 꺼내면 지운다(새로 고침으로 다시 들어가지 않게). 회원 폴더 bgm 경로만 받는다 */
export function takeFmsBgm(): FmsBgm | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const v = JSON.parse(raw) as Partial<FmsBgm>;
    return typeof v.path === "string" && /^[0-9a-f-]{36}\/bgm\/[0-9a-f-]{36}\.(mp3|m4a|wav|ogg|aac)$/i.test(v.path) && typeof v.name === "string" ? { path: v.path, name: v.name.slice(0, 120) } : null;
  } catch { return null; }
}
