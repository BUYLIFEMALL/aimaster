// 루프 렌더링 계획: 파라미터 보정 + ffmpeg 필터/인자 생성(순수 함수, 테스트 가능)
export type LoopMode = "smart" | "overlap" | "bounce";
export type OutFormat = "mp4" | "webm" | "gif";

export interface LoopParams {
  mode: LoopMode;
  start: number; // 초
  end: number; // 초
  crossfade: number; // 초
  repeat: number; // 반복 횟수
  duration: number; // 원본 길이(초)
  hasAudio: boolean;
  format: OutFormat;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const OVERLAP_FIXED = 1; // 강제 오버랩 모드는 1초 고정
export const MAX_REPEAT = 200;
export const MIN_CROSSFADE = 0.1;
export const MAX_CROSSFADE = 2;

/** 입력값을 안전한 범위로 정리한다. 크로스페이드는 구간 길이의 절반을 넘을 수 없다. */
export function normalize(p: LoopParams): LoopParams {
  const duration = Math.max(0.1, p.duration);
  let start = clamp(p.start, 0, duration);
  let end = clamp(p.end, 0, duration);
  if (p.mode === "overlap") { start = 0; end = duration; }
  if (end - start < 0.1) end = Math.min(duration, start + 0.1);
  if (end - start < 0.1) start = Math.max(0, end - 0.1);
  const len = end - start;
  let crossfade = p.mode === "overlap" ? OVERLAP_FIXED : clamp(p.crossfade, MIN_CROSSFADE, MAX_CROSSFADE);
  if (p.mode === "bounce") crossfade = 0;
  const cap = Math.max(0, len / 2 - 0.01);
  crossfade = Math.min(crossfade, cap);
  return { ...p, start, end, crossfade: +crossfade.toFixed(3), repeat: Math.round(clamp(p.repeat, 1, MAX_REPEAT)), duration };
}

/** 한 번 도는 루프 단위의 길이(초) */
export function unitLength(p: LoopParams): number {
  const n = normalize(p);
  const len = n.end - n.start;
  if (n.mode === "bounce") return len * 2;
  return len - n.crossfade;
}

/** 전체 재생 시간(초) */
export function totalLength(p: LoopParams): number {
  return unitLength(p) * normalize(p).repeat;
}

const f = (n: number) => n.toFixed(3);

/**
 * 루프 1회분을 만드는 filter_complex.
 * smart/overlap: 끝 cf초(페이드아웃)와 시작 cf초(페이드인)를 겹쳐 앞에 두고 가운데를 잇는다.
 * bounce: 정방향 뒤에 역방향을 붙인다.
 */
export function buildFilter(p: LoopParams): { filter: string; map: string[] } {
  const n = normalize(p);
  const { start: s, end: e, crossfade: cf } = n;
  const audio = n.hasAudio && n.format !== "gif";
  if (n.mode === "bounce") {
    let fl = `[0:v]trim=${f(s)}:${f(e)},setpts=PTS-STARTPTS,split[v1][v2];[v2]reverse[vr];[v1][vr]concat=n=2:v=1:a=0[vout]`;
    const map = ["-map", "[vout]"];
    if (audio) {
      fl += `;[0:a]atrim=${f(s)}:${f(e)},asetpts=PTS-STARTPTS,asplit[a1][a2];[a2]areverse[ar];[a1][ar]concat=n=2:v=0:a=1[aout]`;
      map.push("-map", "[aout]");
    }
    return { filter: fl, map };
  }
  if (cf <= 0) {
    let fl = `[0:v]trim=${f(s)}:${f(e)},setpts=PTS-STARTPTS[vout]`;
    const map = ["-map", "[vout]"];
    if (audio) { fl += `;[0:a]atrim=${f(s)}:${f(e)},asetpts=PTS-STARTPTS[aout]`; map.push("-map", "[aout]"); }
    return { filter: fl, map };
  }
  const mid = e - s - 2 * cf;
  const parts = [
    `[0:v]trim=${f(e - cf)}:${f(e)},setpts=PTS-STARTPTS[tail]`,
    `[0:v]trim=${f(s)}:${f(s + cf)},setpts=PTS-STARTPTS[head]`,
    `[tail][head]xfade=transition=fade:duration=${f(cf)}:offset=0[blend]`,
  ];
  let vcat = "[blend]";
  let vn = 1;
  if (mid > 0.001) {
    parts.push(`[0:v]trim=${f(s + cf)}:${f(e - cf)},setpts=PTS-STARTPTS[mid]`);
    vcat = "[blend][mid]"; vn = 2;
  }
  parts.push(`${vcat}concat=n=${vn}:v=1:a=0[vout]`);
  const map = ["-map", "[vout]"];
  if (audio) {
    parts.push(
      `[0:a]atrim=${f(e - cf)}:${f(e)},asetpts=PTS-STARTPTS[atail]`,
      `[0:a]atrim=${f(s)}:${f(s + cf)},asetpts=PTS-STARTPTS[ahead]`,
      `[atail][ahead]acrossfade=d=${f(cf)}[ablend]`
    );
    let acat = "[ablend]"; let an = 1;
    if (mid > 0.001) { parts.push(`[0:a]atrim=${f(s + cf)}:${f(e - cf)},asetpts=PTS-STARTPTS[amid]`); acat = "[ablend][amid]"; an = 2; }
    parts.push(`${acat}concat=n=${an}:v=0:a=1[aout]`);
    map.push("-map", "[aout]");
  }
  return { filter: parts.join(";"), map };
}

/** 출력 포맷별 인코딩 인자(1회분 만들기) */
export function encodeArgs(format: OutFormat, hasAudio: boolean): string[] {
  if (format === "gif") return ["-r", "15"];
  if (format === "webm") return ["-c:v", "libvpx", "-b:v", "2M", "-crf", "10", ...(hasAudio ? ["-c:a", "libvorbis"] : ["-an"])];
  return ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", ...(hasAudio ? ["-c:a", "aac", "-b:a", "128k"] : ["-an"])];
}
