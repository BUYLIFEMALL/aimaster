// 디자인 빌더 D1 — 몰 테마(색·모서리·단추·사진 비율) 검사와 CSS 변수 계산(node --test 대상, DB 없음)
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문
//
// 방식: 손님 화면 바깥 상자에 CSS 변수를 덮어쓴다. Tailwind v4 색 클래스(bg-blue-600 등)는 `--color-blue-*`를 읽으므로
// 클래스를 고치지 않고도 포인트색이 바뀐다. 3D 단추처럼 16진수였던 곳은 `--mall-*` 변수 + 원래 값 대체(globals.css).
// 기본 테마(지금 106 스타일)는 변수를 하나도 내보내지 않는다 → 화면 변화 0.

export const IMAGE_RATIOS = ["1:1", "4:5", "3:4", "4:3"] as const;
export const RADII = ["none", "sm", "md", "lg", "xl"] as const;
export const BUTTONS = ["3d", "flat"] as const;
export type ImageRatio = (typeof IMAGE_RATIOS)[number];
export type Radius = (typeof RADII)[number];
export type ButtonStyle = (typeof BUTTONS)[number];

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
};

/** 지금 손님 화면(106 네오 모던) 값 그대로 */
export const DEFAULT_THEME: ShopTheme = { primary: "#2563eb", bg: "#f8fafc", radius: "xl", button: "3d", image_ratio: "1:1" };

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

/** 테마 → 바깥 상자 style에 넣을 CSS 변수. 기본값과 같은 칸은 내보내지 않는다(기본 테마 = 빈 객체) */
export function themeStyle(theme: ShopTheme): Record<string, string> {
  const v: Record<string, string> = {};
  if (theme.primary !== DEFAULT_THEME.primary) {
    const p = buildPalette(theme.primary);
    for (const step of STEPS) {
      v[`--color-blue-${step}`] = p[step];
      v[`--mall-primary-${step}`] = p[step];
    }
  }
  if (theme.bg !== DEFAULT_THEME.bg) v["--mall-bg"] = theme.bg;
  if (theme.radius !== DEFAULT_THEME.radius) v["--mall-radius"] = RADIUS_REM[theme.radius];
  if (theme.button !== DEFAULT_THEME.button) v["--mall-btn-depth"] = "0px";
  if (theme.image_ratio !== DEFAULT_THEME.image_ratio) v["--mall-img-ratio"] = RATIO_CSS[theme.image_ratio];
  return v;
}
