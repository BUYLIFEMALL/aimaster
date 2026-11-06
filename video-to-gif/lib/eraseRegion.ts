// V5 「내 영상 일부 지우기」(2026-11-06): 회원 본인 영상의 본인 표시(로고·글자 등)를 주변 화소로 메운다.
// 엔진은 ffmpeg.wasm delogo. 이 파일에는 화면·ffmpeg 없이 시험할 수 있는 계산만 둔다(tests: lib/eraseRegion.test.ts).

export const MAX_ERASE_SECONDS = 60;
export const MAX_ERASE_BYTES = 100 * 1024 * 1024;
export const MAX_REGIONS = 3;
const MIN_SIDE = 4;

export type Rect = { x: number; y: number; w: number; h: number };
type Size = { w: number; h: number };

/** 넣은 영상이 60초·100MB 안인지 본다. 문제가 없으면 null. */
export function checkEraseFile(size: number, duration: number | undefined): string | null {
  if (size > MAX_ERASE_BYTES) return "100MB 이하 영상만 넣을 수 있습니다.";
  if (duration === undefined || !Number.isFinite(duration) || duration <= 0) {
    return "영상 길이를 읽지 못했습니다. MP4·MOV·WEBM 파일인지 확인해 주세요.";
  }
  if (duration > MAX_ERASE_SECONDS + 0.5) return "60초 이하 영상만 넣을 수 있습니다. 필요한 부분만 잘라서 넣어 주세요.";
  return null;
}

/** delogo는 사각형 바로 바깥 화소로 안을 메우므로 가장자리에서 1화소 띄운다. 너무 작으면 null. */
export function clampRect(r: Rect, width: number, height: number): Rect | null {
  const x = Math.max(1, Math.round(r.x));
  const y = Math.max(1, Math.round(r.y));
  const right = Math.min(width - 1, Math.round(r.x + r.w));
  const bottom = Math.min(height - 1, Math.round(r.y + r.h));
  const w = right - x;
  const h = bottom - y;
  if (w < MIN_SIDE || h < MIN_SIDE) return null;
  return { x, y, w, h };
}

/** 화면에 그린 사각형(표시 크기 기준, 거꾸로 끈 것도 됨)을 영상 화소 기준으로 바꾼다. */
export function toVideoRect(drawn: Rect, shown: Size, video: Size): Rect | null {
  if (!shown.w || !shown.h) return null;
  const sx = video.w / shown.w;
  const sy = video.h / shown.h;
  const left = Math.min(drawn.x, drawn.x + drawn.w);
  const top = Math.min(drawn.y, drawn.y + drawn.h);
  return clampRect({ x: left * sx, y: top * sy, w: Math.abs(drawn.w) * sx, h: Math.abs(drawn.h) * sy }, video.w, video.h);
}

/** 적용 시간(초) 입력을 ffmpeg enable 식으로 바꾼다. 둘 다 비면 영상 전체(식 없음). */
export function enableExpr(start: string, end: string): { expr?: string; error?: string } {
  const s = start.trim() === "" ? undefined : Number(start);
  const e = end.trim() === "" ? undefined : Number(end);
  if (s !== undefined && (!Number.isFinite(s) || s < 0)) return { error: "시작 시간이 올바르지 않습니다." };
  if (e !== undefined && (!Number.isFinite(e) || e <= 0)) return { error: "끝 시간이 올바르지 않습니다." };
  if (s !== undefined && e !== undefined) {
    if (e <= s) return { error: "끝 시간은 시작 시간보다 커야 합니다." };
    return { expr: `between(t,${s},${e})` };
  }
  if (s !== undefined && s > 0) return { expr: `gte(t,${s})` };
  if (e !== undefined) return { expr: `lte(t,${e})` };
  return {};
}

/** 사각형마다 delogo를 잇고, libx264가 받는 짝수 크기로 맞춘다. */
export function eraseFilter(rects: Rect[], expr?: string): string {
  const enable = expr ? `:enable='${expr}'` : "";
  const delogo = rects.map((r) => `delogo=x=${r.x}:y=${r.y}:w=${r.w}:h=${r.h}${enable}`);
  return [...delogo, "scale=trunc(iw/2)*2:trunc(ih/2)*2"].join(",");
}

/** 결과 파일 이름: 원래 이름 뒤에 「-지움」을 붙인 MP4. */
export function erasedFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").trim() || "video";
  return `${base}-지움.mp4`;
}

/** 실행 기록에 남길 파일 이름(표 제약: 1~200자). */
export function logFileName(name: string): string {
  const trimmed = name.trim();
  return (trimmed || "video").slice(0, 200);
}
