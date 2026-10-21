// D-68-03(2026-10-22): 기획 목록에서 고른 완성 곡을 「제작 목록」으로 내보낸다 — CSV 파일과 영상 설명용 목차.
// 다른 도구(편집기·유튜브 설명란)에 제목·순서·길이를 다시 입력하다 생기는 오타·순서 혼동을 줄이려는 것.
// 회원 화면 안에서만 만들고(서버 저장·다른 앱 호출 없음), 키·Suno 작업 번호·저장소 주소는 넣지 않는다.

export interface ExportSong {
  planningTitle: string;
  title: string;
  mode: string; // "vocal" | "instrumental"
  durationSeconds: number | null;
  style: string | null;
}

/** 초 → "3:05" / 한 시간이 넘으면 "1:02:05" */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** 이어 붙였을 때 각 곡의 시작 시각. 길이를 모르는 곡이 나오면 그 뒤 곡들의 시작 시각은 알 수 없어 null. */
export function startTimes(songs: ExportSong[]): (number | null)[] {
  let at: number | null = 0;
  return songs.map((song) => {
    const start = at;
    at = at != null && song.durationSeconds != null ? at + song.durationSeconds : null;
    return start;
  });
}

/** 파일 이름에 쓸 수 없는 글자를 바꾸고, 같은 제목이 겹쳐도 앞 번호로 구분되게 「01 - 제목.mp3」 */
export function suggestedFileName(index: number, title: string): string {
  const safe = title.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim() || "제목 없음";
  return `${String(index + 1).padStart(2, "0")} - ${safe}.mp3`;
}

/** 유튜브 설명란에 붙이는 목차: 「0:00 제목」 줄. 시작 시각을 모르는 곡은 시각 없이 제목만. */
export function buildChapters(songs: ExportSong[]): string {
  const starts = startTimes(songs);
  return songs.map((song, i) => (starts[i] != null ? `${formatClock(starts[i]!)} ${song.title}` : song.title)).join("\n");
}

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** 엑셀에서 한글이 깨지지 않도록 앞에 BOM을 붙인 CSV */
export function buildCsv(songs: ExportSong[]): string {
  const starts = startTimes(songs);
  const header = ["순서", "기획", "곡 제목", "버전", "길이", "영상 안 시작", "스타일", "권장 파일명"];
  const rows = songs.map((song, i) => [
    String(i + 1),
    song.planningTitle,
    song.title,
    song.mode === "instrumental" ? "연주곡" : "보컬",
    song.durationSeconds != null ? formatClock(song.durationSeconds) : "",
    starts[i] != null ? formatClock(starts[i]!) : "",
    song.style ?? "",
    suggestedFileName(i, song.title),
  ]);
  return "﻿" + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
