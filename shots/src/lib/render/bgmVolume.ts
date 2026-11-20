// 2026-11-20 영상 담당: 브라우저 렌더 배경음악 크기(순수 함수). 전에는 story.ts에서 0.5로 고정이었다.
// 목소리가 나오는 동안 배경음악을 자동으로 낮추는 것(공용 인코더 mixVoiceAndBgm의 DUCK 0.35)은 그대로이고,
// 여기서는 그 기준이 되는 「평소 크기」만 회원이 고른다.

export const BGM_VOLUME_DEFAULT = 0.5;
export const BGM_VOLUME_MIN = 0;
export const BGM_VOLUME_MAX = 1;
export const BGM_VOLUME_STEP = 0.05;

/** 화면·저장값이 이상해도 0~1 사이로 맞춘다. 숫자가 아니면(빈 값·null·글자 포함) 기본값. 0.05 단위로 반올림.
 *  Number(null)·Number("")가 0이 되어 몰래 음소거되지 않도록 숫자·숫자 글자만 받는다. */
export function clampBgmVolume(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : Number.NaN;
  if (!Number.isFinite(n)) return BGM_VOLUME_DEFAULT;
  const c = Math.min(BGM_VOLUME_MAX, Math.max(BGM_VOLUME_MIN, n));
  return Number((Math.round(c / BGM_VOLUME_STEP) * BGM_VOLUME_STEP).toFixed(2)); // 0.35000000000000003 같은 소수 오차 제거
}

/** 슬라이더 옆 표시: "50%", 0이면 "끔". */
export function bgmVolumeLabel(v: number): string {
  const c = clampBgmVolume(v);
  return c === 0 ? "끔" : `${Math.round(c * 100)}%`;
}

/** 섞을 배경음악 입력. 음악 주소가 없거나 크기가 0이면 null — 0은 소리를 아예 섞지 않는 진짜 음소거(파일도 받지 않음). */
export function bgmMixInput(src: string | null | undefined, volume: unknown): { src: string; volume: number } | null {
  if (!src) return null;
  const v = clampBgmVolume(volume);
  return v === 0 ? null : { src, volume: v };
}

/** 화면에 배경음악 크기 칸을 보일지: 고른 배경음악이 있을 때만. */
export function showBgmVolumeControl(bgmUrl: string | null | undefined): boolean {
  return !!bgmUrl;
}
