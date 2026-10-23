// v1.18 장면 길이를 가사 시간표에 맞춘다 — 곡 가사가 Lyria 시간 가사(「[0.0:3.7] 가사」)면 장면 가사의 첫 줄이 나오는 시각에 장면을 바꾼다.
// 첫 장면은 0초부터(전주 포함), 마지막 장면은 곡 끝까지. 한 장면이라도 못 맞추면 null → 화면이 곡 길이를 고르게 나눈다(splitEvenly).
// 서버·화면·node 시험이 함께 쓰는 순수 함수.
import { amsTimedLines } from "./amsLyrics";

/** 장면 하나가 이보다 짧아지면 맞추지 않은 것으로 본다 */
const MIN_SCENE_S = 1;

/** 비교용으로 가사 한 줄을 정리 — 시간·구간 표시([..]·(Chorus)), 띄어쓰기, 문장 부호를 뺀다 */
export function normalizeLyric(s: string): string {
  return s
    .replace(/\[[^\]]*\]|\((?:intro|verse|pre-?chorus|chorus|bridge|outro|hook)[^)]*\)/gi, " ")
    .replace(/[\s.,!?~'"“”‘’·…\-–—]/g, "")
    .toLowerCase();
}

/** 장면 가사에서 처음으로 글이 있는 줄(정리 후) */
function firstLine(lyric: string): string {
  for (const l of lyric.split(/\r?\n/)) {
    const n = normalizeLyric(l);
    if (n) return n;
  }
  return "";
}

/** 한쪽이 다른 쪽을 포함 — 짧은 쪽이 두 글자 이상이고 긴 쪽의 절반 이상일 때만(「노래」 같은 짧은 줄이 아무 데나 맞지 않게) */
function overlaps(a: string, b: string): boolean {
  const [s, l] = a.length <= b.length ? [a, b] : [b, a];
  return s.length >= 2 && s.length * 2 >= l.length && l.includes(s);
}

/**
 * 장면마다 길이(초)를 돌려준다. 맞추지 못하면 null.
 * - 시간 가사 줄을 앞에서부터 차례로 찾는다(같은 후렴이 여러 번 나와도 순서대로 맞춘다).
 * - 장면 첫 줄과 시간 가사 줄이 같거나, 한쪽이 다른 쪽을 포함하면 같은 줄로 본다.
 */
export function sceneLengthsFromLyrics(rawLyrics: string, sceneLyrics: string[], songSec: number): number[] | null {
  const lines = amsTimedLines(rawLyrics);
  if (!lines || !sceneLyrics.length || !(songSec > 0)) return null;
  const norm = lines.map((l) => normalizeLyric(l.text));
  const starts: number[] = [];
  let from = 0;
  for (const lyric of sceneLyrics) {
    const head = firstLine(lyric);
    if (!head) return null;
    let hit = -1;
    for (let i = from; i < norm.length; i++) {
      const n = norm[i];
      if (n && (n === head || overlaps(n, head))) { hit = i; break; }
    }
    if (hit < 0) return null;
    starts.push(lines[hit].start);
    from = hit + 1;
  }
  starts[0] = 0; // 첫 장면은 전주부터
  const out: number[] = [];
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1] : songSec;
    const len = Math.round((end - starts[i]) * 100) / 100;
    if (!(len >= MIN_SCENE_S)) return null;
    out.push(len);
  }
  return out;
}
