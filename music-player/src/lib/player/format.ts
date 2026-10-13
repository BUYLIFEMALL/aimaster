export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = s < 10 ? `0${s}` : String(s);
  if (h > 0) return `${h}:${m < 10 ? "0" : ""}${m}:${ss}`;
  return `${m}:${ss}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

/** 파일 이름 → 제목/아티스트. "아티스트 - 제목" 규칙, 확장자·앞쪽 트랙 번호 제거 */
export function parseFileName(fileName: string): { name: string; artist: string } {
  const base = fileName.replace(/\.[^/.]+$/, "").replace(/_/g, " ").trim();
  const noNumber = base.replace(/^\d{1,3}\s*[-.)]\s*/, "");
  const parts = noNumber.split(" - ");
  if (parts.length > 1 && parts[0].trim() && parts.slice(1).join(" - ").trim()) {
    return { artist: parts[0].trim(), name: parts.slice(1).join(" - ").trim() };
  }
  return { artist: "", name: noNumber || base || fileName };
}

const AUDIO_EXT = /\.(mp3|m4a|aac|wav|flac|ogg|oga|opus|weba|webm|wma|aiff?)$/i;
export function isAudioFile(file: { name: string; type: string }): boolean {
  return file.type.startsWith("audio/") || AUDIO_EXT.test(file.name);
}
