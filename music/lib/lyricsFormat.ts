import type { TimedLine } from "./sunoAlign";

// 줄 단위 시간 가사 → 노래방 자막 파일(2026-10-21 Suno V6 1차 기능 「타임스탬프 가사」).
// LRC: 음악 플레이어·노래방용 [mm:ss.xx]가사 / SRT: 유튜브·영상 편집기 자막(번호, 시작 --> 끝, 가사).

function lrcTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`;
}

function srtTime(sec: number): string {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
}

export function toLrc(lines: TimedLine[], title: string): string {
  return [`[ti:${title.replace(/[\[\]\n]/g, " ")}]`, ...lines.map((l) => `[${lrcTime(l.start)}]${l.text}`)].join("\n") + "\n";
}

export function toSrt(lines: TimedLine[]): string {
  return lines.map((l, i) => `${i + 1}\n${srtTime(l.start)} --> ${srtTime(l.end)}\n${l.text}\n`).join("\n");
}
