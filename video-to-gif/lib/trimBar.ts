// v1.13: 구간 막대 계산(화면과 무관한 순수 함수). 값은 초, 0.1초 단위.

export const TRIM_STEP = 0.1;

/** 0.1초 단위로 맞춘다(부동소수 오차 제거). */
export function snap(t: number): number {
  return Math.round(t / TRIM_STEP) / 10;
}

/** 입력칸 문자열을 막대 위치(초)로 바꾼다. 빈칸·잘못된 값은 기본값(처음 0, 끝 영상 길이). */
export function parseTrim(start: string, end: string, duration: number): { start: number; end: number } {
  const s = start.trim() === "" ? 0 : Number(start);
  const e = end.trim() === "" ? duration : Number(end);
  const s2 = Number.isFinite(s) ? Math.min(Math.max(s, 0), duration) : 0;
  const e2 = Number.isFinite(e) ? Math.min(Math.max(e, 0), duration) : duration;
  return e2 > s2 ? { start: s2, end: e2 } : { start: 0, end: duration };
}

/** 막대 위 가로 비율(0~1)을 초로 바꾼다. */
export function ratioToTime(ratio: number, duration: number): number {
  return snap(Math.min(Math.max(ratio, 0), 1) * duration);
}

/**
 * 손잡이 하나를 t초로 옮긴다. 영상 밖으로 나가지 않고, 시작과 끝 사이는 최소 0.1초를 지킨다.
 * 끝 손잡이가 영상 끝에 닿으면 끝 칸은 빈칸(=끝까지)으로, 시작이 0이면 시작 칸도 빈칸으로 돌려준다.
 */
export function moveHandle(
  which: "start" | "end",
  t: number,
  current: { start: number; end: number },
  duration: number
): { trimStart: string; trimEnd: string; start: number; end: number } {
  let { start, end } = current;
  if (which === "start") start = Math.min(Math.max(snap(t), 0), snap(end - TRIM_STEP));
  else end = Math.max(Math.min(snap(t), duration), snap(start + TRIM_STEP));
  start = Math.max(start, 0);
  end = Math.min(end, duration);
  return {
    start,
    end,
    trimStart: start <= 0 ? "" : String(start),
    trimEnd: end >= duration - TRIM_STEP / 2 ? "" : String(end)
  };
}
