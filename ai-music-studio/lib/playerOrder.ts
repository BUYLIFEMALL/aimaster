// 미니 플레이어 곡 순서 규칙(반복·무작위) — 화면·소리와 분리한 순수 함수라 시험으로 확인한다.
export type RepeatMode = "off" | "all" | "one";

export const REPEAT_ORDER: RepeatMode[] = ["off", "all", "one"];
export const nextRepeat = (m: RepeatMode): RepeatMode => REPEAT_ORDER[(REPEAT_ORDER.indexOf(m) + 1) % REPEAT_ORDER.length];

interface Options {
  repeat: RepeatMode;
  shuffle: boolean;
  /** 곡이 끝나서 넘어가는가(한 곡 반복은 이때만 같은 곡) — 「다음 곡」 버튼은 false */
  ended: boolean;
  random?: () => number;
}

/** 다음에 재생할 곡의 번호. 없으면 null(멈춤). keys는 화면에 보이는 곡 순서. */
export function pickNext(keys: string[], currentKey: string | null, o: Options): number | null {
  if (keys.length === 0) return null;
  const i = currentKey == null ? -1 : keys.indexOf(currentKey);
  if (o.ended && o.repeat === "one" && i >= 0) return i;
  if (o.shuffle) {
    if (keys.length === 1) return o.repeat === "off" ? null : 0;
    const rnd = o.random ?? Math.random;
    const others = keys.map((_, k) => k).filter((k) => k !== i);
    return others[Math.min(others.length - 1, Math.floor(rnd() * others.length))];
  }
  if (i + 1 < keys.length) return i + 1;
  return o.repeat === "off" ? null : 0;
}

/** 이전 곡: 무작위면 실제로 들은 기록(history, 마지막이 지금 곡 앞)에서, 아니면 화면 순서에서. */
export function pickPrev(keys: string[], currentKey: string | null, o: { repeat: RepeatMode; shuffle: boolean; history: string[] }): number | null {
  if (keys.length === 0) return null;
  if (o.shuffle) {
    for (let h = o.history.length - 1; h >= 0; h--) {
      const k = keys.indexOf(o.history[h]);
      if (k >= 0 && o.history[h] !== currentKey) return k;
    }
    return null;
  }
  const i = currentKey == null ? -1 : keys.indexOf(currentKey);
  if (i > 0) return i - 1;
  return o.repeat === "all" ? keys.length - 1 : null;
}
