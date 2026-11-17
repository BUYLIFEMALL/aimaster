// 디자인 빌더 D1 — 몰 테마(색·모서리·단추·사진 비율) 검사와 CSS 변수 계산(node --test 대상, DB 없음)
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문
//
// 방식: 유저 화면 바깥 상자에 CSS 변수를 덮어쓴다. Tailwind v4 색 클래스(bg-blue-600 등)는 `--color-blue-*`를 읽으므로
// 클래스를 고치지 않고도 포인트색이 바뀐다. 3D 단추처럼 16진수였던 곳은 `--mall-*` 변수 + 원래 값 대체(globals.css).
// 기본 테마(지금 106 스타일)는 변수를 하나도 내보내지 않는다 → 화면 변화 0.

export const IMAGE_RATIOS = ["1:1", "4:5", "3:4", "4:3"] as const;
export const RADII = ["none", "sm", "md", "lg", "xl"] as const;
export const BUTTONS = ["3d", "flat"] as const;
export const MODES = ["light", "dark"] as const;
export type ImageRatio = (typeof IMAGE_RATIOS)[number];
export type Radius = (typeof RADII)[number];
export type ButtonStyle = (typeof BUTTONS)[number];
export type Mode = (typeof MODES)[number];

export type ShopTheme = {
  /** 포인트색(#rrggbb) — 단추·링크·강조. 이 색이 팔레트의 600 단계가 된다 */
  primary: string;
  /** 화면 바탕색(#rrggbb) */
  bg: string;
  /** 단추 모서리 */
  radius: Radius;
  /** 단추 모양: 입체(아래 그림자) / 평면 */
  button: ButtonStyle;
  /** 상품 사진 비율(가로:세로) — 쇼윈도·목록 카드 */
  image_ratio: ImageRatio;
  /** 밝기(I23): 밝게(기본) / 어둡게 — 어둡게면 회색 단계·포인트색 옅은 단계를 뒤집고 흰 카드를 어두운 면으로 */
  mode: Mode;
};

/** 지금 유저 화면(106 네오 모던) 값 그대로 */
export const DEFAULT_THEME: ShopTheme = { primary: "#2563eb", bg: "#f8fafc", radius: "xl", button: "3d", image_ratio: "1:1", mode: "light" };

const HEX = /^#[0-9a-f]{6}$/;
const RADIUS_REM: Record<Radius, string> = { none: "0", sm: "0.25rem", md: "0.5rem", lg: "0.625rem", xl: "0.75rem" };
const RATIO_CSS: Record<ImageRatio, string> = { "1:1": "1 / 1", "4:5": "4 / 5", "3:4": "3 / 4", "4:3": "4 / 3" };
export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
// Tailwind v4 blue 단계의 밝기·채도(OKLCH) — 포인트색을 600에 놓고 이 모양대로 늘린다
const LADDER_L = [0.97, 0.932, 0.882, 0.809, 0.707, 0.623, 0.546, 0.488, 0.424, 0.379, 0.282];
const LADDER_C = [0.014, 0.032, 0.059, 0.105, 0.165, 0.214, 0.245, 0.243, 0.199, 0.146, 0.091];
const ANCHOR = 6; // 600

function pick<T extends string>(v: unknown, list: readonly T[], fallback: T): T {
  return typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : fallback;
}
function hexOr(v: unknown, fallback: string): string {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return HEX.test(s) ? s : fallback;
}

/** DB에서 읽은 값(모양 모름) → 올바른 테마. 틀린 칸은 기본값 */
export function readTheme(raw: unknown): ShopTheme {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    primary: hexOr(o.primary, DEFAULT_THEME.primary),
    bg: hexOr(o.bg, DEFAULT_THEME.bg),
    radius: pick(o.radius, RADII, DEFAULT_THEME.radius),
    button: pick(o.button, BUTTONS, DEFAULT_THEME.button),
    image_ratio: pick(o.image_ratio, IMAGE_RATIOS, DEFAULT_THEME.image_ratio),
    mode: pick(o.mode, MODES, DEFAULT_THEME.mode),
  };
}

/** 저장 전 검사 — 틀린 칸이 있으면 한국어 오류 목록 */
export function validateTheme(raw: unknown): string[] {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  if (!o) return ["테마 모양이 올바르지 않습니다."];
  const errs: string[] = [];
  // 색 칸을 비우면 「기본색」 — 빈 값은 통과(readTheme이 기본값으로 읽음)
  const badColor = (v: unknown) => v !== undefined && v !== "" && !(typeof v === "string" && HEX.test(v.trim().toLowerCase()));
  if (badColor(o.primary)) errs.push("포인트색은 #2563eb 같은 6자리 색 코드로 넣어 주세요(비우면 기본색).");
  if (badColor(o.bg)) errs.push("바탕색은 #f8fafc 같은 6자리 색 코드로 넣어 주세요(비우면 기본색).");
  if (o.radius !== undefined && !(RADII as readonly unknown[]).includes(o.radius)) errs.push("모서리 값이 올바르지 않습니다.");
  if (o.button !== undefined && !(BUTTONS as readonly unknown[]).includes(o.button)) errs.push("단추 모양 값이 올바르지 않습니다.");
  if (o.image_ratio !== undefined && !(IMAGE_RATIOS as readonly unknown[]).includes(o.image_ratio)) errs.push("사진 비율 값이 올바르지 않습니다.");
  if (o.mode !== undefined && !(MODES as readonly unknown[]).includes(o.mode)) errs.push("밝기 값이 올바르지 않습니다.");
  return errs;
}

// ── 색 계산(sRGB ↔ OKLCH, Björn Ottosson 공식) ──
function toLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
/** #rrggbb → [L(0~1), C, H(도)] */
export function hexToOklch(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = toLinear(((n >> 16) & 255) / 255);
  const g = toLinear(((n >> 8) & 255) / 255);
  const b = toLinear((n & 255) / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.sqrt(A * A + B * B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  return [L, C, H];
}

const round = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;

/** 포인트색 하나 → 50~950 단계(CSS oklch 문자열). 600 단계는 고른 색 그대로 */
export function buildPalette(hex: string): Record<(typeof STEPS)[number], string> {
  const [L, C, H] = hexToOklch(hex);
  const dL = L - LADDER_L[ANCHOR];
  const cScale = C / LADDER_C[ANCHOR];
  const out = {} as Record<(typeof STEPS)[number], string>;
  STEPS.forEach((step, i) => {
    const w = Math.max(0, 1 - Math.abs(i - ANCHOR) / ANCHOR); // 600에서 멀수록 밝기 이동을 줄인다(50·950 근처는 거의 그대로)
    const l = i === ANCHOR ? L : Math.min(0.985, Math.max(0.12, LADDER_L[i] + dL * w));
    const c = i === ANCHOR ? C : Math.min(0.37, LADDER_C[i] * cScale);
    out[step] = `oklch(${round(l * 100, 2)}% ${round(c, 4)} ${round(C < 0.002 ? 0 : H, 2)})`;
  });
  return out;
}

// ── 단추 전용 색(FRONT-20261117-03) ──
// 흰 글자 단추 바탕이 포인트색 그대로라 밝은 포인트색(에메랄드·코랄·오렌지 등)은 대비 4.5:1 미달.
// 미달인 색만 같은 색상각으로 밝기를 조금씩 낮춰(색역 밖이면 채도도 줄임) 처음 4.5를 넘는 색을 단추 전용으로 쓴다.
/** OKLCH → #rrggbb(8비트 반올림) */
function oklchToHex(L: number, C: number, H: number): string {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  if (lin.some((v) => v < -1e-4 || v > 1 + 1e-4)) return "";
  return "#" + lin.map((v) => { const c = Math.min(1, Math.max(0, v)); const g = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; return Math.round(g * 255).toString(16).padStart(2, "0"); }).join("");
}
/** #rrggbb의 WCAG 상대 휘도 */
function hexLuminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * toLinear(((n >> 16) & 255) / 255) + 0.7152 * toLinear(((n >> 8) & 255) / 255) + 0.0722 * toLinear((n & 255) / 255);
}
/** 흰 글자(#fff) 대비 — WCAG 상대 휘도 */
export function whiteContrast(hex: string): number {
  return 1.05 / (hexLuminance(hex) + 0.05);
}
/** CSS 「oklch(L% C H)」 문자열의 상대 휘도(브라우저처럼 색역 밖은 0~1로 자름) */
function oklchLuminance(css: string): number {
  const m = css.match(/oklch\(([\d.]+)% ([\d.]+) ([\d.]+)\)/);
  if (!m) return 0;
  const [L, C, H] = [Number(m[1]) / 100, Number(m[2]), Number(m[3])];
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s].map((v) => Math.min(1, Math.max(0, v)));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
const ratio = (y1: number, y2: number) => (Math.max(y1, y2) + 0.05) / (Math.min(y1, y2) + 0.05);
/**
 * 상점 머리글 카테고리 탭 마우스 올림 글자 전용 색(FRONT-20261118-02).
 * 올림 상태 = `hover:text-blue-600` on `hover:bg-slate-100` — 밝게: 포인트색 on slate-100, 어둡게: 뒤집힌 단계(팔레트 400) on 뒤집힌 slate-100(= slate-900 값).
 * 대비 4.5 미만인 색만 같은 색상각으로 밝기를 옮겨(밝게는 어둡게·어둡게는 밝게, 색역 밖이면 채도 줄임) 처음 4.55를 넘는 #rrggbb, 아니면 null.
 */
export function navHoverColor(hex: string, mode: Mode): string | null {
  const h = typeof hex === "string" ? hex.trim().toLowerCase() : "";
  if (!HEX.test(h)) return null;
  const dark = mode === "dark";
  const p = buildPalette(h);
  const text = dark ? p[400] : p[600];
  const yBg = oklchLuminance(dark ? SLATE[STEPS.length - 2] : SLATE[1]);
  if (ratio(oklchLuminance(text), yBg) >= 4.5) return null;
  const [, C, H] = hexToOklch(h);
  const L0 = Number(text.match(/oklch\(([\d.]+)%/)![1]) / 100;
  const step = dark ? 0.001 : -0.001;
  for (let l = L0 + step; l > 0.05 && l < 0.99; l += step) {
    let c = Number(text.match(/oklch\([\d.]+% ([\d.]+)/)![1]) || C;
    let out = oklchToHex(l, c, H);
    while (!out && c > 0) { c = Math.max(0, c - 0.002); out = oklchToHex(l, c, H); }
    if (out && ratio(hexLuminance(out), yBg) >= 4.55) return out; // 4.55: 브라우저가 바탕을 8비트로 반올림해도 4.5 아래로 안 떨어지게(네이비 어둡게 4.50 경계 실측)
  }
  return dark ? "#ffffff" : "#000000";
}
/** 흰 글자 대비가 4.5 미만인 포인트색만 단추 전용 색(#rrggbb), 괜찮거나 잘못된 색이면 null */
export function buttonColor(hex: string): string | null {
  const h = typeof hex === "string" ? hex.trim().toLowerCase() : "";
  if (!HEX.test(h) || whiteContrast(h) >= 4.5) return null;
  const [L, C, H] = hexToOklch(h);
  for (let l = L - 0.001; l > 0.05; l -= 0.001) {
    let c = C;
    let out = oklchToHex(l, c, H);
    while (!out && c > 0) { c = Math.max(0, c - 0.002); out = oklchToHex(l, c, H); }
    if (out && whiteContrast(out) >= 4.5) return out;
  }
  return "#000000";
}
/** 단추 전용 색의 마우스 올림 색 — Tailwind 600→700 밝기 간격(0.058)만큼 더 진하게(대비는 더 커짐). 단추 전용 색이 없으면 null */
export function buttonHoverColor(hex: string): string | null {
  const btn = buttonColor(hex);
  if (!btn) return null;
  const [L, C, H] = hexToOklch(btn);
  const l = L - (LADDER_L[ANCHOR] - LADDER_L[ANCHOR + 1]);
  for (let c = C; c >= 0; c = c > 0 ? Math.max(0, c - 0.002) : -1) {
    const out = oklchToHex(l, c, H);
    if (out) return out;
  }
  return btn;
}

// ── I23 어두운 테마 ──
// Tailwind v4 기본 회색 값(node_modules/tailwindcss/theme.css) — 어둡게면 50↔950처럼 뒤집어 넣는다
const SLATE = ["oklch(98.4% 0.003 247.858)", "oklch(96.8% 0.007 247.896)", "oklch(92.9% 0.013 255.508)", "oklch(86.9% 0.022 252.894)", "oklch(70.4% 0.04 256.788)", "oklch(55.4% 0.046 257.417)", "oklch(44.6% 0.043 257.281)", "oklch(37.2% 0.044 257.287)", "oklch(27.9% 0.041 260.031)", "oklch(20.8% 0.042 265.755)", "oklch(12.9% 0.042 264.695)"];
const GRAY = ["oklch(98.5% 0.002 247.839)", "oklch(96.7% 0.003 264.542)", "oklch(92.8% 0.006 264.531)", "oklch(87.2% 0.01 258.338)", "oklch(70.7% 0.022 261.325)", "oklch(55.1% 0.027 264.364)", "oklch(44.6% 0.03 256.802)", "oklch(37.3% 0.034 259.733)", "oklch(27.8% 0.033 256.848)", "oklch(21% 0.034 264.665)", "oklch(13% 0.028 261.692)"];
/** 어둡게일 때 흰 카드(bg-white) 대신 쓰는 면 색 — globals.css [data-mall-mode="dark"] */
const DARK_SURFACE = "oklch(22% 0.01 260)";

/** 색 밝기(OKLCH L)가 낮으면 어두운 색 */
export function isDarkColor(hex: string): boolean {
  return HEX.test(hex.toLowerCase()) ? hexToOklch(hex.toLowerCase())[0] < 0.6 : false;
}

/** 색 대비 경고(E4 일부) — 바탕 밝기와 밝기 칸이 어긋나 글자가 안 보일 때 한국어 안내, 괜찮으면 null */
export function contrastWarning(theme: ShopTheme): string | null {
  const dark = isDarkColor(theme.bg);
  if (dark && theme.mode === "light") return "바탕색이 어두워 글자가 잘 안 보입니다 — 밝기를 「어둡게」로 바꾸거나 밝은 바탕색을 고르세요.";
  if (!dark && theme.mode === "dark") return "밝기가 「어둡게」인데 바탕색이 밝습니다 — 어두운 바탕색을 고르거나 밝기를 「밝게」로 바꾸세요.";
  return null;
}

/** 테마 → 바깥 상자 style에 넣을 CSS 변수. 기본값과 같은 칸은 내보내지 않는다(기본 테마 = 빈 객체) */
export function themeStyle(theme: ShopTheme): Record<string, string> {
  const v: Record<string, string> = {};
  const dark = theme.mode === "dark";
  if (theme.primary !== DEFAULT_THEME.primary || dark) {
    const p = buildPalette(theme.primary);
    STEPS.forEach((step, i) => {
      // 글자·옅은 배경용 클래스 색(--color-blue-*)은 어둡게면 뒤집고, 단추 색(--mall-primary-*)은 그대로
      v[`--color-blue-${step}`] = dark ? p[STEPS[STEPS.length - 1 - i]] : p[step];
      if (theme.primary !== DEFAULT_THEME.primary || dark) v[`--mall-primary-${step}`] = p[step];
    });
  }
  if (dark) {
    STEPS.forEach((step, i) => {
      v[`--color-slate-${step}`] = SLATE[STEPS.length - 1 - i];
      v[`--color-gray-${step}`] = GRAY[STEPS.length - 1 - i];
    });
    v["--mall-surface"] = DARK_SURFACE;
  }
  // 단추 전용 색 — 흰 글자 대비 미달 색만(나머지는 변수 없음 = 화면 그대로). globals.css가 이 변수가 있는 상자 안에서만 씀
  const btn = buttonColor(theme.primary);
  if (btn) {
    v["--mall-primary-btn"] = btn;
    v["--mall-primary-btn-hover"] = buttonHoverColor(theme.primary) ?? btn;
  }
  // 카테고리 탭 올림 글자 전용 색 — 대비 미달 색만(나머지는 변수 없음 = 화면 그대로)
  const navHover = navHoverColor(theme.primary, theme.mode);
  if (navHover) v["--mall-nav-hover"] = navHover;
  if (theme.bg !== DEFAULT_THEME.bg) v["--mall-bg"] = theme.bg;
  if (theme.radius !== DEFAULT_THEME.radius) v["--mall-radius"] = RADIUS_REM[theme.radius];
  if (theme.button !== DEFAULT_THEME.button) v["--mall-btn-depth"] = "0px";
  if (theme.image_ratio !== DEFAULT_THEME.image_ratio) v["--mall-img-ratio"] = RATIO_CSS[theme.image_ratio];
  return v;
}
