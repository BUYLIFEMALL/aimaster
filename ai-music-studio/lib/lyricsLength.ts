// AI 가사 분량 맞추기 — 곡 길이에 맞는 최대 줄 수와, 넘치면 구간([Verse] 등) 단위로 자르기.
// 2026-10-23 실호출: 30초 곡 요청에 27줄이 나와(지시 8~12줄) 서버에서 분량을 보장한다.

/** 구간 표시를 뺀 가사 줄 수 상한 */
export function maxLyricLines(durationS: number): number {
  if (durationS <= 45) return 10;
  if (durationS <= 120) return 22;
  return 34;
}

const isTag = (line: string) => /^\s*\[[^\]]+\]\s*$/.test(line);

/** 가사 줄 수(구간 표시·빈 줄 제외) */
export function countLyricLines(lyrics: string): number {
  return lyrics.split("\n").filter((l) => l.trim() && !isTag(l)).length;
}

/**
 * 상한을 넘으면 구간 단위로 앞에서부터 담고, 다음 구간을 통째로 넣으면 넘칠 때 멈춘다.
 * 첫 구간 하나가 상한보다 길면 그 구간 안에서 줄 단위로 자른다. 상한 이하면 그대로 돌려준다.
 */
export function fitLyrics(lyrics: string, maxLines: number): string {
  const text = lyrics.replace(/\r\n/g, "\n").trim();
  if (countLyricLines(text) <= maxLines) return text;

  const sections: string[][] = [];
  for (const line of text.split("\n")) {
    if (isTag(line) || sections.length === 0) sections.push([]);
    sections[sections.length - 1].push(line);
  }

  const out: string[] = [];
  let used = 0;
  for (const sec of sections) {
    const n = sec.filter((l) => l.trim() && !isTag(l)).length;
    if (used + n <= maxLines) {
      out.push(...sec);
      used += n;
      continue;
    }
    if (used === 0) {
      for (const l of sec) {
        if (l.trim() && !isTag(l)) {
          if (used >= maxLines) break;
          used++;
        }
        out.push(l);
      }
    }
    break;
  }
  return out.join("\n").trim();
}
