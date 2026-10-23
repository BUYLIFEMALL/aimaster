// 가사 영상 디자인 값과 프리셋. 저장(DB)·미리보기·내보내기가 모두 이 모양을 쓴다.
// 프리셋 이름·조합은 이 프로그램용으로 새로 만들었다(참고 앱의 프리셋을 옮기지 않음).

export type Aspect = "landscape" | "portrait";
export type Layout = "panel" | "center";
export type Highlight = "color" | "box" | "outline" | "marker" | "underline" | "bar" | "karaoke";
export type SpectrumKind = "none" | "bars" | "mirror" | "wave";
export type Align = "left" | "center";
export type FontId = "noto" | "gowun" | "dohyeon" | "blackhan" | "myeongjo" | "pen";

export interface Design {
  presetId: string;
  aspect: Aspect;
  layout: Layout;
  bg1: string; bg2: string;
  /** 커버가 있으면 흐리게 깐 커버를 배경으로 쓴다 */
  coverBackdrop: boolean;
  text: string; accent: string;
  font: FontId;
  highlight: Highlight;
  /** 현재 줄 앞뒤로 보여 줄 줄 수(0~3) */
  context: number;
  align: Align;
  /** 가사 크기 배율(0.7~1.4) */
  size: number;
  spectrum: SpectrumKind;
  progress: boolean;
  showTitle: boolean;
  /** 움직이는 빛 배경 세기(0~1) */
  ambient: number;
  fps: 24 | 30;
}

export const FONTS: Record<FontId, { label: string; family: string; weight: number; css: string }> = {
  noto: { label: "노토 산스 — 표준 고딕", family: "Noto Sans KR", weight: 700, css: "Noto+Sans+KR:wght@400;700;900" },
  gowun: { label: "고운돋움 — 단정한 고딕", family: "Gowun Dodum", weight: 400, css: "Gowun+Dodum" },
  dohyeon: { label: "도현 — 굵은 제목", family: "Do Hyeon", weight: 400, css: "Do+Hyeon" },
  blackhan: { label: "검은고딕 — 묵직한 강조", family: "Black Han Sans", weight: 400, css: "Black+Han+Sans" },
  myeongjo: { label: "나눔명조 — 우아한 명조", family: "Nanum Myeongjo", weight: 700, css: "Nanum+Myeongjo:wght@400;700;800" },
  pen: { label: "나눔손글씨 펜 — 손글씨", family: "Nanum Pen Script", weight: 400, css: "Nanum+Pen+Script" },
};
export const FONT_IDS = Object.keys(FONTS) as FontId[];
export const GOOGLE_FONTS_HREF = `https://fonts.googleapis.com/css2?${FONT_IDS.map((k) => `family=${FONTS[k].css}`).join("&")}&display=swap`;

export const HIGHLIGHTS: { id: Highlight; label: string; hint: string }[] = [
  { id: "color", label: "색 강조", hint: "글자 색만 바뀝니다" },
  { id: "box", label: "채운 박스", hint: "줄 뒤를 강조색으로 채웁니다" },
  { id: "outline", label: "테두리 박스", hint: "줄에 선을 두릅니다" },
  { id: "marker", label: "형광펜", hint: "글자 아래를 칠합니다" },
  { id: "underline", label: "밑줄 긋기", hint: "부르는 동안 밑줄이 그어집니다" },
  { id: "bar", label: "앞 막대", hint: "줄 앞에 막대를 세웁니다" },
  { id: "karaoke", label: "노래방 채움", hint: "왼쪽부터 색이 차오릅니다" },
];

export const SPECTRUMS: { id: SpectrumKind; label: string }[] = [
  { id: "none", label: "없음" }, { id: "bars", label: "막대" }, { id: "mirror", label: "가운데 대칭" }, { id: "wave", label: "파형" },
];

const BASE: Omit<Design, "presetId" | "aspect"> = {
  layout: "panel", bg1: "#141028", bg2: "#06060c", coverBackdrop: true, text: "#ffffff", accent: "#a78bfa", font: "noto",
  highlight: "color", context: 2, align: "left", size: 1, spectrum: "bars", progress: true, showTitle: true, ambient: 0.6, fps: 30,
};

export interface Preset { id: string; name: string; desc: string; design: Design }
const preset = (id: string, aspect: Aspect, name: string, desc: string, d: Partial<Design>): Preset => ({ id, name, desc, design: { ...BASE, ...d, presetId: id, aspect } });

export const PRESETS: Preset[] = [
  preset("night-stage", "landscape", "나이트 스테이지", "보라 조명, 커버 패널과 막대 스펙트럼", {}),
  preset("cinema", "landscape", "시네마 자막", "가운데 정렬 명조, 흐린 커버 배경", { layout: "center", font: "myeongjo", align: "center", highlight: "underline", accent: "#fbbf24", bg1: "#1a1208", bg2: "#050403", spectrum: "none", context: 1 }),
  preset("neon-karaoke", "landscape", "네온 노래방", "형광 노란 글자가 왼쪽부터 차오름", { layout: "center", font: "blackhan", align: "center", highlight: "karaoke", accent: "#facc15", text: "#f0abfc", bg1: "#2e0a3a", bg2: "#07020c", spectrum: "mirror", context: 1, size: 1.1 }),
  preset("paper-day", "landscape", "밝은 종이", "밝은 바탕에 어두운 글자, 형광펜", { bg1: "#f7f1e3", bg2: "#e8dcc2", text: "#2b2118", accent: "#f59e0b", highlight: "marker", font: "gowun", ambient: 0.25, coverBackdrop: false }),
  preset("ocean-box", "landscape", "오션 박스", "청록 채운 박스로 현재 줄 강조", { bg1: "#062a33", bg2: "#020d12", accent: "#2dd4bf", highlight: "box", font: "dohyeon", spectrum: "wave" }),
  preset("mono-minimal", "landscape", "모노 미니멀", "흑백, 장식 없이 큰 글자", { layout: "center", align: "center", bg1: "#161616", bg2: "#000000", accent: "#ffffff", text: "#9ca3af", highlight: "color", spectrum: "none", ambient: 0.15, context: 2, size: 1.15, coverBackdrop: false }),
  preset("v-stage", "portrait", "세로 스테이지", "쇼츠용 — 위 커버, 아래 가사", { context: 1, align: "center" }),
  preset("v-neon", "portrait", "세로 네온", "쇼츠용 노래방 채움", { font: "blackhan", align: "center", highlight: "karaoke", accent: "#facc15", text: "#f0abfc", bg1: "#2e0a3a", bg2: "#07020c", spectrum: "mirror", context: 1 }),
  preset("v-paper", "portrait", "세로 종이", "밝은 바탕, 손글씨", { bg1: "#f7f1e3", bg2: "#e8dcc2", text: "#2b2118", accent: "#ea580c", highlight: "marker", font: "pen", align: "center", ambient: 0.25, coverBackdrop: false, context: 1, size: 1.15 }),
  preset("v-cinema", "portrait", "세로 시네마", "흐린 커버 위 명조 자막", { layout: "center", font: "myeongjo", align: "center", highlight: "underline", accent: "#fbbf24", bg1: "#1a1208", bg2: "#050403", spectrum: "none", context: 2 }),
];

export const DEFAULT_DESIGN: Design = PRESETS[0].design;
export const presetsFor = (aspect: Aspect) => PRESETS.filter((p) => p.design.aspect === aspect);

export function sizeFor(aspect: Aspect): { W: number; H: number } {
  return aspect === "portrait" ? { W: 1080, H: 1920 } : { W: 1920, H: 1080 };
}

const HEX = /^#[0-9a-f]{6}$/i;
const pick = <T extends string>(v: unknown, list: readonly T[], fb: T): T => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : fb);
const num = (v: unknown, lo: number, hi: number, fb: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fb);
const color = (v: unknown, fb: string) => (typeof v === "string" && HEX.test(v) ? v : fb);

/** 저장된 값(옛 버전·잘못된 값 포함)을 안전한 디자인으로 바꾼다 */
export function normalizeDesign(raw: unknown): Design {
  const d = (raw && typeof raw === "object" ? raw : {}) as Partial<Design>;
  const base = PRESETS.find((p) => p.id === d.presetId)?.design ?? DEFAULT_DESIGN;
  return {
    presetId: typeof d.presetId === "string" ? d.presetId.slice(0, 40) : base.presetId,
    aspect: pick(d.aspect, ["landscape", "portrait"], base.aspect),
    layout: pick(d.layout, ["panel", "center"], base.layout),
    bg1: color(d.bg1, base.bg1), bg2: color(d.bg2, base.bg2),
    coverBackdrop: typeof d.coverBackdrop === "boolean" ? d.coverBackdrop : base.coverBackdrop,
    text: color(d.text, base.text), accent: color(d.accent, base.accent),
    font: pick(d.font, FONT_IDS, base.font),
    highlight: pick(d.highlight, HIGHLIGHTS.map((h) => h.id), base.highlight),
    context: Math.round(num(d.context, 0, 3, base.context)),
    align: pick(d.align, ["left", "center"], base.align),
    size: num(d.size, 0.7, 1.4, base.size),
    spectrum: pick(d.spectrum, SPECTRUMS.map((s) => s.id), base.spectrum),
    progress: typeof d.progress === "boolean" ? d.progress : base.progress,
    showTitle: typeof d.showTitle === "boolean" ? d.showTitle : base.showTitle,
    ambient: num(d.ambient, 0, 1, base.ambient),
    fps: d.fps === 24 ? 24 : 30,
  };
}
