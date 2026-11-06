// V2 해설 교차편집(2026-11-06): 내 해설 녹음 1개 + 내 촬영본 여러 개 → 해설 문장마다 촬영본을 번갈아 배치(순수 함수, 화면·ffmpeg 없이 시험).
// 해설은 영상 합치기의 소리 칸(배경음악 자리, 음량 100%·줄이기 없음)에 그대로 깔리고, 장면 길이는 문장 시각을 따라간다.
import type { Seg } from "./clipPlan";

/** 장면 수 상한(영상 합치기 MAX_CLIPS와 같음) */
export const MAX_SCENES = 20;
/** 해설 길이 상한(영상 합치기 MAX_TOTAL_S와 같음) */
export const MAX_NARRATION_S = 180;
export const MAX_FOOTAGE = 10;
/** 마지막 문장 뒤 여유(초) */
export const TAIL_PAD_S = 0.3;
const MIN_SCENE_S = 0.5;
const round1 = (n: number) => Math.round(n * 10) / 10;

export type CrossScene = {
  /** 촬영본 번호(0부터) */
  file: number;
  /** 촬영본에서 앞·뒤로 잘라낼 초(영상 합치기 trimStart·trimEnd) */
  trimStart: number;
  trimEnd: number;
  /** 촬영본이 장면보다 짧을 때 더 보여 줄 초(반복 재생) */
  hold: number;
  /** 해설 문장(자막) */
  caption: string;
  /** 완성 영상에서 이 장면이 시작하는 초·길이 */
  at: number;
  seconds: number;
};

/** 문장이 상한보다 많으면 이어진 두 문장 중 합친 길이가 가장 짧은 쌍부터 합친다 */
export function limitSegs(segs: Seg[], max = MAX_SCENES): Seg[] {
  const out = segs.map((s) => ({ ...s }));
  while (out.length > max) {
    let best = 0;
    let bestLen = Infinity;
    for (let i = 0; i + 1 < out.length; i++) {
      const len = out[i + 1].end - out[i].start;
      if (len < bestLen) { bestLen = len; best = i; }
    }
    const a = out[best], b = out[best + 1];
    out.splice(best, 2, { start: a.start, end: b.end, text: `${a.text} ${b.text}`.replace(/\s+/g, " ").trim() });
  }
  return out;
}

/**
 * 문장마다 장면 하나. 장면 i는 문장 i 시작(첫 장면은 0초)부터 다음 문장 시작까지(마지막은 끝 + 여유),
 * 촬영본은 번갈아 쓰되 같은 촬영본은 지난번 쓴 곳 뒤에서 이어 쓰고, 끝에 닿으면 처음으로 돌아간다.
 * 촬영본이 장면보다 짧으면 반복 재생(hold).
 */
export function planCrossCut(segs: Seg[], footageSeconds: number[], order?: number[]): CrossScene[] {
  if (!segs.length || !footageSeconds.length) return [];
  const cursors = footageSeconds.map(() => 0);
  const scenes: CrossScene[] = [];
  segs.forEach((seg, i) => {
    const at = i === 0 ? 0 : round1(seg.start);
    const endAt = i < segs.length - 1 ? round1(segs[i + 1].start) : round1(seg.end + TAIL_PAD_S);
    const seconds = Math.max(MIN_SCENE_S, round1(endAt - at));
    const file = order && Number.isInteger(order[i]) && order[i] >= 0 && order[i] < footageSeconds.length ? order[i] : i % footageSeconds.length;
    const dur = footageSeconds[file];
    let trimStart = 0, trimEnd = 0, hold = 0;
    if (dur < seconds) {
      hold = round1(seconds - dur);
      cursors[file] = 0;
    } else {
      let c = cursors[file];
      if (c + seconds > dur + 0.05) c = 0;
      trimStart = round1(c);
      trimEnd = Math.max(0, round1(dur - c - seconds));
      cursors[file] = round1(c + seconds);
    }
    scenes.push({ file, trimStart, trimEnd, hold, caption: seg.text, at, seconds });
  });
  return scenes;
}

export const crossCutSeconds = (scenes: CrossScene[]) => round1(scenes.reduce((n, s) => n + s.seconds, 0));
