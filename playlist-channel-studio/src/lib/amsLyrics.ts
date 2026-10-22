// v1.10 AI 음악 스튜디오(ai-music-studio) 곡의 가사 → 가사 줄 시간표.
// Google Lyria는 「[0.0:3.7] 가사 한 줄」처럼 줄마다 시작·끝 초를 붙여 돌려준다(2026-10-23 실호출 확인) — 그 형식이면 시간을 그대로 쓰고,
// 아니면 null을 돌려 화면이 가사 글로 넣게 한다. 서버·화면·node 시험이 함께 쓰는 순수 함수(가져오기 없음).
export interface AmsTimedLine { start: number; end: number; text: string }

const TIMED = /^\s*\[(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\]\s*(.*)$/;

export function amsTimedLines(raw: string | null | undefined): AmsTimedLine[] | null {
  const rows = (raw ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!rows.length) return null;
  const out: AmsTimedLine[] = [];
  let timed = 0;
  for (const row of rows) {
    const m = TIMED.exec(row);
    if (!m) continue;
    timed++;
    const text = m[3].replace(/^\[[^\]]*\]\s*/, "").trim(); // 줄 앞 구간 표시([Chorus])는 뺀다
    const start = Number(m[1]), end = Number(m[2]);
    if (!text || !(end > start)) continue;
    out.push({ start, end, text });
  }
  // 시간 표시가 절반 넘는 줄에 있어야 시간 가사로 본다(설명 문장만 온 경우 제외)
  if (!out.length || timed < rows.length / 2) return null;
  return out.sort((a, b) => a.start - b.start);
}
