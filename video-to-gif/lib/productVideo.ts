// v1.30 「🛍 상품 사진 영상」(메이커 v0.3.3 후속 M2) — 사진 1~6장 → MP4·상세페이지용 애니메이션 WebP. 키·AI 없음.
// 화면과 무관한 순수 계산만 둔다(시간표·움직임·전환·파일 이름 묶기·WebP 용량 단계). 그리기는 components/ProductVideoStudio.tsx.
// 움직임·전환의 종류와 이름은 우리가 새로 정했다(외부 프로그램의 이름·종류를 옮기지 않음).

export const MAX_PHOTOS = 6;

export const TEMPOS = {
  fast: { label: "빠르게", per: 1.8 },
  normal: { label: "보통", per: 2.5 },
  slow: { label: "여유 있게", per: 3.6 },
} as const;
export type TempoKey = keyof typeof TEMPOS;

export const MOTIONS = {
  auto: "🎲 사진마다 다르게",
  zoomIn: "천천히 다가가기",
  zoomOut: "천천히 물러나기",
  panRight: "왼쪽에서 오른쪽",
  panLeft: "오른쪽에서 왼쪽",
  rise: "아래에서 위로",
  hold: "가만히",
} as const;
export type MotionKey = keyof typeof MOTIONS;
const MOTION_CYCLE: Exclude<MotionKey, "auto">[] = ["zoomIn", "panRight", "zoomOut", "rise", "panLeft"];

export const TRANSITIONS = {
  auto: "🎲 자동 섞기",
  fade: "부드럽게 겹치기",
  slide: "옆으로 밀기",
  zoom: "확대하며 넘기기",
  flash: "반짝 넘기기",
  cut: "바로 넘기기",
} as const;
export type TransitionKey = keyof typeof TRANSITIONS;
const TRANSITION_CYCLE: Exclude<TransitionKey, "auto">[] = ["fade", "slide", "zoom", "flash"];
export const TRANSITION_SEC = 0.45;

export const RATIOS = {
  vertical: { label: "세로 9:16 (쇼츠·릴스)", w: 1080, h: 1920 },
  square: { label: "정사각 1:1", w: 1080, h: 1080 },
  detail: { label: "상세페이지 860px (4:5)", w: 860, h: 1075 },
} as const;
export type RatioKey = keyof typeof RATIOS;

export const FPS_OPTIONS = [15, 30, 60] as const;

/** 사진 n장의 전체 길이(초) */
export function totalSeconds(n: number, tempo: TempoKey): number {
  return Math.max(1, n) * TEMPOS[tempo].per;
}

/** t초에 보일 사진 번호와 그 사진 안에서의 진행(0~1), 다음 사진으로 넘어가는 중이면 넘김 진행(0~1) */
export function frameAt(t: number, n: number, tempo: TempoKey): { i: number; u: number; k: number | null } {
  const per = TEMPOS[tempo].per; const count = Math.max(1, n);
  const i = Math.min(count - 1, Math.max(0, Math.floor(t / per)));
  const local = t - i * per; const u = Math.min(1, Math.max(0, local / per));
  const left = per - local;
  const k = i < count - 1 && left <= TRANSITION_SEC ? Math.min(1, Math.max(0, 1 - left / TRANSITION_SEC)) : null;
  return { i, u, k };
}

export function motionFor(i: number, chosen: MotionKey): Exclude<MotionKey, "auto"> {
  return chosen === "auto" ? MOTION_CYCLE[i % MOTION_CYCLE.length] : chosen;
}
export function transitionFor(i: number, chosen: TransitionKey): Exclude<TransitionKey, "auto"> {
  return chosen === "auto" ? TRANSITION_CYCLE[i % TRANSITION_CYCLE.length] : chosen;
}

const ease = (x: number) => x * x * (3 - 2 * x);
/** 움직임 → 확대 배율과 이동(화면 크기에 대한 비율). 상품 형태를 지키려고 확대는 12%까지만 */
export function motionTransform(m: Exclude<MotionKey, "auto">, u: number): { scale: number; dx: number; dy: number } {
  const e = ease(Math.min(1, Math.max(0, u)));
  switch (m) {
    case "zoomIn": return { scale: 1 + 0.12 * e, dx: 0, dy: 0 };
    case "zoomOut": return { scale: 1.12 - 0.12 * e, dx: 0, dy: 0 };
    case "panRight": return { scale: 1.1, dx: -0.035 + 0.07 * e, dy: 0 };
    case "panLeft": return { scale: 1.1, dx: 0.035 - 0.07 * e, dy: 0 };
    case "rise": return { scale: 1.08, dx: 0, dy: 0.03 - 0.06 * e };
    default: return { scale: 1.02, dx: 0, dy: 0 };
  }
}

/** 사진 원본 비율을 지키며(잘라내지 않음) 상자 안에 넣을 크기 */
export function containRect(iw: number, ih: number, bw: number, bh: number): { w: number; h: number } {
  const s = Math.min(bw / iw, bh / ih); return { w: iw * s, h: ih * s };
}

const IMAGE_RE = /\.(jpe?g|png|webp)$/i;
const CODE_RE = /^(.+?)[_-]([1-6])\.(jpe?g|png|webp)$/i;
/**
 * 여러 상품 한꺼번에: 파일 이름 `상품코드_1.jpg`~`상품코드_6.jpg`를 상품코드별로 묶는다(번호 순).
 * 규칙에 맞지 않는 파일과 같은 번호가 겹친 파일은 skipped로 돌려준다.
 */
export function groupByCode<T extends { name: string }>(files: T[]): { groups: { code: string; files: T[] }[]; skipped: string[] } {
  const map = new Map<string, Map<number, T>>(); const skipped: string[] = [];
  for (const f of files) {
    const m = f.name.match(CODE_RE);
    if (!m) { skipped.push(f.name); continue; }
    const code = m[1].trim(); const idx = Number(m[2]);
    const g = map.get(code) ?? new Map<number, T>();
    if (g.has(idx)) { skipped.push(f.name); continue; }
    g.set(idx, f); map.set(code, g);
  }
  const groups = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "ko"))
    .map(([code, g]) => ({ code, files: Array.from(g.entries()).sort((a, b) => a[0] - b[0]).map(([, f]) => f) }));
  return { groups, skipped };
}
export const isImageName = (name: string) => IMAGE_RE.test(name);

/** 문구의 {상품코드}를 바꾼다 */
export function withCode(text: string, code: string): string {
  return text.split("{상품코드}").join(code);
}

/** 내려받을 파일 이름(경로 글자 제거, 60자 안) */
export function safeName(base: string, ext: "mp4" | "webp"): string {
  const b = base.replace(/[\\/:*?"<>|]/g, "").trim().slice(0, 60) || "product";
  return `${b}.${ext}`;
}

// ── 상세페이지용 애니메이션 WebP: 10MB 이하가 될 때까지 크기·화질·초당 장면 수를 단계적으로 낮춘다 ──
export const WEBP_MAX_BYTES = 10 * 1024 * 1024;
export type WebpStep = { scale: number; quality: number; fps: number };
export const WEBP_LADDER: ReadonlyArray<WebpStep> = [
  { scale: 1, quality: 75, fps: 20 },
  { scale: 1, quality: 62, fps: 20 },
  { scale: 0.85, quality: 60, fps: 15 },
  { scale: 0.72, quality: 56, fps: 15 },
  { scale: 0.6, quality: 52, fps: 12 },
  { scale: 0.5, quality: 48, fps: 10 },
];
/** 이번 단계 결과가 상한을 넘었을 때 다음에 시도할 단계. 많이 넘으면 한 칸 더 건너뛴다. 더 없으면 -1 */
export function nextWebpIndex(current: number, bytes: number, max = WEBP_MAX_BYTES): number {
  if (bytes <= max) return current;
  const jump = bytes > max * 2 ? 2 : 1;
  const next = current + jump;
  if (current >= WEBP_LADDER.length - 1) return -1;
  return Math.min(next, WEBP_LADDER.length - 1);
}
/** ffmpeg 인자: MP4 → 애니메이션 WebP(무한 반복, 소리 없음). 가로는 짝수로 */
export function webpArgs(input: string, output: string, width: number, step: WebpStep): string[] {
  const w = Math.max(2, Math.round((width * step.scale) / 2) * 2);
  return ["-i", input, "-vf", `fps=${step.fps},scale=${w}:-2:flags=lanczos`, "-c:v", "libwebp_anim", "-quality", String(step.quality), "-loop", "0", "-an", output];
}
