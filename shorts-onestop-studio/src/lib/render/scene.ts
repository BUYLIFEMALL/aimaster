// 세로 쇼츠 장면 렌더러(1080×1920, 30fps 기준). 미리보기(P3)와 MP4 출력(P6)이 같은 함수를 쓴다.
// 순수 캔버스 그리기 — 참고 원본의 영상 합성 라이브러리(Remotion)를 쓰지 않고 새로 만들었다.
// 둥근 사각형 그리기는 yt-playlist-studio/src/lib/render/color-utils.ts의 drawRoundRect 패턴을 따랐다.
import { normalizeBackdrop, sceneVoices, type Bg, type ShortsScript } from "@/lib/script";
import { captionChunks, normalizeAudio } from "@/lib/voice";

export const W = 1080, H = 1920, FPS = 30;

export const THEMES = {
  rose: { name: "로즈 선셋", bg: ["#3b0a1e", "#9d174d", "#f43f5e"], accent: "#fb7185", card: "rgba(255,255,255,0.10)", text: "#ffffff", sub: "#ffe4e6" },
  midnight: { name: "미드나잇", bg: ["#020617", "#1e1b4b", "#4338ca"], accent: "#818cf8", card: "rgba(255,255,255,0.08)", text: "#f8fafc", sub: "#c7d2fe" },
  mint: { name: "민트 프레시", bg: ["#022c22", "#065f46", "#10b981"], accent: "#6ee7b7", card: "rgba(255,255,255,0.10)", text: "#ffffff", sub: "#d1fae5" },
  ocean: { name: "딥 오션", bg: ["#082f49", "#0e7490", "#22d3ee"], accent: "#67e8f9", card: "rgba(255,255,255,0.10)", text: "#ffffff", sub: "#cffafe" },
  gold: { name: "블랙 골드", bg: ["#0a0a0a", "#1c1917", "#44403c"], accent: "#fbbf24", card: "rgba(251,191,36,0.10)", text: "#fafaf9", sub: "#fde68a" },
  candy: { name: "캔디 팝", bg: ["#701a75", "#c026d3", "#f472b6"], accent: "#fde047", card: "rgba(255,255,255,0.14)", text: "#ffffff", sub: "#fae8ff" },
  paper: { name: "페이퍼 화이트", bg: ["#fafaf9", "#f5f5f4", "#e7e5e4"], accent: "#e11d48", card: "rgba(15,23,42,0.06)", text: "#0f172a", sub: "#475569" },
  forest: { name: "포레스트", bg: ["#14240f", "#365314", "#65a30d"], accent: "#bef264", card: "rgba(255,255,255,0.09)", text: "#ffffff", sub: "#ecfccb" },
} as const;
export type ThemeKey = keyof typeof THEMES;

export const LAYOUTS = {
  center: "가운데 카드",
  bottom: "하단 자막형",
  number: "큰 숫자형",
  split: "위아래 분할",
  minimal: "글자만 크게",
  mix: "🎲 장면마다 다르게",
} as const;
export type LayoutKey = keyof typeof LAYOUTS;
const CYCLE: Exclude<LayoutKey, "mix">[] = ["center", "number", "split", "bottom", "minimal"];

// 공식 무료 글꼴(Google Fonts, OFL) — 원본 묶음의 글꼴 파일을 쓰지 않는다
export const FONTS = {
  blackhan: { name: "블랙한산스(굵게)", family: "Black Han Sans", weight: "400" },
  dohyeon: { name: "도현", family: "Do Hyeon", weight: "400" },
  jua: { name: "주아(둥글게)", family: "Jua", weight: "400" },
  noto: { name: "노토 산스(깔끔)", family: "Noto Sans KR", weight: "900" },
  pen: { name: "나눔 손글씨", family: "Nanum Pen Script", weight: "400" },
} as const;
export type FontKey = keyof typeof FONTS;
export const FONT_CSS = "https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Do+Hyeon&family=Jua&family=Nanum+Pen+Script&family=Noto+Sans+KR:wght@500;700;900&display=swap";

export const EFFECTS = { shadow: "그림자", stroke: "외곽선", glow: "네온", none: "효과 없음" } as const;
export type EffectKey = keyof typeof EFFECTS;

export interface Design { theme: ThemeKey; layout: LayoutKey; font: FontKey; effect: EffectKey; badges: boolean }
export const DEFAULT_DESIGN: Design = { theme: "rose", layout: "center", font: "blackhan", effect: "shadow", badges: true };
export function normalizeDesign(d: Partial<Design> | undefined): Design {
  return {
    theme: d?.theme && d.theme in THEMES ? d.theme : DEFAULT_DESIGN.theme,
    layout: d?.layout && d.layout in LAYOUTS ? d.layout : DEFAULT_DESIGN.layout,
    font: d?.font && d.font in FONTS ? d.font : DEFAULT_DESIGN.font,
    effect: d?.effect && d.effect in EFFECTS ? d.effect : DEFAULT_DESIGN.effect,
    badges: typeof d?.badges === "boolean" ? d.badges : DEFAULT_DESIGN.badges,
  };
}

// ── 타임라인: 장면 음성이 있으면 그 길이 + 0.5초, 없으면 내레이션 글자 수로 어림(한국어 약 7자/초) ──
export interface Segment { kind: "intro" | "card" | "outro"; index: number; start: number; dur: number; voiceDur?: number }
const est = (text: string, min: number) => Math.max(min, Math.round((text.replace(/\s/g, "").length / 7 + 0.8) * 10) / 10);
export const LEAD = 0.25; // 장면이 시작되고 목소리가 나오기까지(초)
export function timeline(s: ShortsScript): { segs: Segment[]; total: number } {
  const segs: Segment[] = []; let t = 0; const vs = sceneVoices(s);
  const push = (kind: Segment["kind"], index: number, fallback: string, min: number, v?: { dur: number }) => {
    const dur = v ? Math.max(min - 0.5, Math.round((LEAD + v.dur + 0.5) * 100) / 100) : est(fallback, min);
    segs.push({ kind, index, start: t, dur, voiceDur: v?.dur }); t += dur;
  };
  push("intro", 0, s.intro.narration || s.intro.title, 3, vs[0].voice);
  s.cards.forEach((c, i) => push("card", i, c.narration || c.title, 3, vs[i + 1].voice));
  push("outro", 0, s.outro.narration || s.outro.title, 4, vs[vs.length - 1].voice);
  return { segs, total: Math.round(t * 100) / 100 };
}

/** 자막: 내레이션 조각을 글자 수 비율로 목소리 길이에 나눠 배치(정확한 단어 시각이 없는 TTS용 근사) */
function drawCaption(ctx: CanvasRenderingContext2D, s: ShortsScript, seg: Segment, u: number, accent: string) {
  const a = normalizeAudio(s.audio); if (!a.captions.on) return;
  const text = seg.kind === "intro" ? s.intro.narration : seg.kind === "outro" ? s.outro.narration : s.cards[seg.index]?.narration;
  if (!text) return;
  const chunks = captionChunks(text); const span = seg.voiceDur ?? Math.max(0.5, seg.dur - 0.6); const t0 = seg.voiceDur ? LEAD : 0.3;
  const total = chunks.reduce((n, c) => n + c.length, 0) || 1; let acc = 0; let cur = "";
  for (const c of chunks) { const st = t0 + (acc / total) * span; acc += c.length; const en = t0 + (acc / total) * span; if (u >= st && u < en) { cur = c; break; } }
  if (!cur) return;
  const px = Math.round(58 * a.captions.size), y = H - a.captions.y;
  ctx.save(); ctx.font = `800 ${px}px "Noto Sans KR", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const w = Math.min(W - 80, ctx.measureText(cur).width + 70), h = px * 1.55;
  if (a.captions.style === "band") { ctx.fillStyle = "rgba(0,0,0,0.62)"; roundRect(ctx, (W - w) / 2, y - h / 2, w, h, 18); ctx.fill(); ctx.fillStyle = "#ffffff"; ctx.fillText(cur, W / 2, y + 2); }
  else if (a.captions.style === "yellow") { ctx.lineWidth = 10; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.strokeText(cur, W / 2, y); ctx.fillStyle = "#fde047"; ctx.fillText(cur, W / 2, y); }
  else if (a.captions.style === "outline") { ctx.lineWidth = 12; ctx.lineJoin = "round"; ctx.strokeStyle = "#000000"; ctx.strokeText(cur, W / 2, y); ctx.fillStyle = "#ffffff"; ctx.fillText(cur, W / 2, y); }
  else { ctx.fillStyle = accent; roundRect(ctx, (W - w) / 2, y - h / 2, w, h, h / 2); ctx.fill(); ctx.fillStyle = "#111827"; ctx.fillText(cur, W / 2, y + 2); }
  ctx.restore();
}
export function segmentAt(segs: Segment[], t: number): Segment {
  return segs.find((g) => t >= g.start && t < g.start + g.dur) ?? segs[segs.length - 1];
}

// ── 그리기 도우미 ──
const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
/** 한국어 줄바꿈: 공백 우선, 너무 긴 낱말은 글자 단위로 자른다 */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean); const lines: string[] = []; let cur = "";
  const pushWord = (w: string) => {
    const cand = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(cand).width <= maxW) { cur = cand; return; }
    if (cur) { lines.push(cur); cur = ""; }
    if (ctx.measureText(w).width <= maxW) { cur = w; return; }
    let part = ""; for (const ch of w) { if (ctx.measureText(part + ch).width > maxW) { lines.push(part); part = ch; } else part += ch; } cur = part;
  };
  words.forEach(pushWord); if (cur) lines.push(cur);
  if (lines.length > maxLines) { const kept = lines.slice(0, maxLines); kept[maxLines - 1] = `${kept[maxLines - 1].replace(/.$/, "")}…`; return kept; }
  return lines;
}
/** 글자 크기를 줄여 가며 maxLines 안에 넣는다 */
function fitText(ctx: CanvasRenderingContext2D, text: string, fontOf: (px: number) => string, maxW: number, start: number, min: number, maxLines: number) {
  for (let px = start; px >= min; px -= 4) { ctx.font = fontOf(px); const lines = wrap(ctx, text, maxW, 99); if (lines.length <= maxLines) return { px, lines }; }
  ctx.font = fontOf(min); return { px: min, lines: wrap(ctx, text, maxW, maxLines) };
}
function drawLines(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, lh: number, color: string, effect: EffectKey, accent: string, align: CanvasTextAlign = "center") {
  ctx.textAlign = align; ctx.textBaseline = "middle";
  lines.forEach((l, i) => {
    const yy = y + i * lh;
    ctx.save();
    if (effect === "shadow") { ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6; }
    if (effect === "glow") { ctx.shadowColor = accent; ctx.shadowBlur = 36; }
    if (effect === "stroke") { ctx.lineWidth = 12; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(0,0,0,0.75)"; ctx.strokeText(l, x, yy); }
    ctx.fillStyle = color; ctx.fillText(l, x, yy);
    ctx.restore();
  });
}
function pill(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, font: string, bg: string, fg: string) {
  ctx.font = font; const w = ctx.measureText(text).width + 64, h = 78;
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fillStyle = bg; ctx.fill();
  ctx.fillStyle = fg; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, cx, cy + 2);
}

function background(ctx: CanvasRenderingContext2D, th: (typeof THEMES)[ThemeKey], t: number) {
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
  g.addColorStop(0, th.bg[0]); g.addColorStop(0.55, th.bg[1]); g.addColorStop(1, th.bg[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // 천천히 떠다니는 빛 번짐(움직이는 배경)
  for (let i = 0; i < 4; i++) {
    const px = W * (0.2 + 0.6 * ((Math.sin(t * 0.25 + i * 1.7) + 1) / 2)), py = H * (0.15 + 0.7 * ((Math.cos(t * 0.2 + i * 2.3) + 1) / 2));
    const r = 380 + 120 * Math.sin(t * 0.5 + i);
    const rg = ctx.createRadialGradient(px, py, 0, px, py, r);
    rg.addColorStop(0, `${th.accent}55`); rg.addColorStop(1, `${th.accent}00`);
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  }
}

function progress(ctx: CanvasRenderingContext2D, th: (typeof THEMES)[ThemeKey], count: number, active: number) {
  const gap = 14, w = Math.min(120, (W - 160 - gap * (count - 1)) / count), total = count * w + (count - 1) * gap;
  for (let i = 0; i < count; i++) { roundRect(ctx, (W - total) / 2 + i * (w + gap), 120, w, 10, 5); ctx.fillStyle = i <= active ? th.accent : "rgba(255,255,255,0.25)"; ctx.fill(); }
}

/** 배경 미디어(사진·영상 프레임)를 화면을 꽉 채우게(cover) 그리고 천천히 확대한다(켄 번즈) */
function drawMedia(ctx: CanvasRenderingContext2D, el: CanvasImageSource, progress: number, dim: number) {
  const iw = (el as HTMLVideoElement).videoWidth || (el as HTMLImageElement).naturalWidth || W;
  const ih = (el as HTMLVideoElement).videoHeight || (el as HTMLImageElement).naturalHeight || H;
  if (!iw || !ih) return false;
  const zoom = 1 + 0.08 * Math.min(1, Math.max(0, progress));
  const scale = Math.max(W / iw, H / ih) * zoom, dw = iw * scale, dh = ih * scale;
  ctx.drawImage(el, (W - dw) / 2, (H - dh) / 2, dw, dh);
  ctx.fillStyle = `rgba(0,0,0,${dim})`; ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, H * 0.55, 0, H); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.45)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  return true;
}

/** 시각 t(초)의 한 프레임을 그린다. opts.safe=true면 유튜브 UI 가림 영역을 표시(미리보기 전용).
 *  opts.media: 배경(Bg)에 해당하는 불러온 이미지·영상 요소를 돌려주는 함수(없거나 아직 로딩 중이면 테마 배경) */
export function renderFrame(ctx: CanvasRenderingContext2D, s: ShortsScript, d: Design, t: number, opts: { safe?: boolean; media?: (bg: Bg) => CanvasImageSource | null } = {}) {
  const th = THEMES[d.theme], f = FONTS[d.font];
  const titleFont = (px: number) => `${f.weight} ${px}px "${f.family}", "Noto Sans KR", sans-serif`;
  const bodyFont = (px: number) => `700 ${px}px "Noto Sans KR", sans-serif`;
  const { segs } = timeline(s); const seg = segmentAt(segs, t); const u = t - seg.start;
  const inA = ease(u / 0.55), inB = ease((u - 0.18) / 0.55), out = 1 - ease((u - (seg.dur - 0.3)) / 0.3);
  ctx.save(); ctx.clearRect(0, 0, W, H);
  background(ctx, th, t);
  const bd = normalizeBackdrop(s.backdrop);
  if (bd.mode !== "theme" && opts.media) {
    const sceneBg = seg.kind === "intro" ? s.intro.bg : seg.kind === "outro" ? s.outro.bg : s.cards[seg.index]?.bg;
    const bg = bd.mode === "scene" ? sceneBg ?? bd.global : bd.global;
    const el = bg ? opts.media(bg) : null;
    if (el) drawMedia(ctx, el, u / seg.dur, bd.dim);
  }
  ctx.globalAlpha = out;

  if (seg.kind === "intro") {
    const lift = (1 - inA) * 60;
    if (s.intro.eyebrow) { ctx.globalAlpha = out * inA; pill(ctx, s.intro.eyebrow, W / 2, 700 + lift, bodyFont(40), th.accent, th.bg[0]); }
    ctx.globalAlpha = out * inA;
    const { px, lines } = fitText(ctx, s.intro.title, titleFont, W - 160, 132, 80, 4);
    ctx.font = titleFont(px); drawLines(ctx, lines, W / 2, 860 + lift + (4 - lines.length) * px * 0.35, px * 1.18, th.text, d.effect, th.accent);
    ctx.globalAlpha = out * inB; ctx.font = bodyFont(38); ctx.fillStyle = th.sub; ctx.textAlign = "center"; ctx.fillText("끝까지 보면 확실히 알게 됩니다 ↓", W / 2, 1420);
  } else if (seg.kind === "outro") {
    ctx.globalAlpha = out * inA;
    const { px, lines } = fitText(ctx, s.outro.title, titleFont, W - 180, 110, 70, 3);
    ctx.font = titleFont(px); drawLines(ctx, lines, W / 2, 760, px * 1.18, th.text, d.effect, th.accent);
    ctx.globalAlpha = out * inB;
    if (s.outro.subtitle) { ctx.font = bodyFont(44); const sl = wrap(ctx, s.outro.subtitle, W - 220, 2); drawLines(ctx, sl, W / 2, 760 + lines.length * px * 1.18 + 40, 60, th.sub, "none", th.accent); }
    (s.outro.cta.length ? s.outro.cta : ["구독", "좋아요"]).slice(0, 3).forEach((c, i) => pill(ctx, c, W / 2, 1260 + i * 110, bodyFont(40), i === 0 ? th.accent : "rgba(255,255,255,0.16)", i === 0 ? th.bg[0] : th.text));
  } else {
    const c = s.cards[seg.index]; const layout = d.layout === "mix" ? CYCLE[seg.index % CYCLE.length] : d.layout;
    progress(ctx, th, s.cards.length, seg.index);
    const lift = (1 - inA) * 70; const tag = c.tag || `${seg.index + 1}`;
    ctx.globalAlpha = out * inA;
    if (layout === "center" || layout === "minimal") {
      if (layout === "center") { roundRect(ctx, 90, 600 + lift, W - 180, 760, 48); ctx.fillStyle = th.card; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = `${th.accent}66`; ctx.stroke(); }
      if (d.badges) pill(ctx, tag, W / 2, 690 + lift, bodyFont(42), th.accent, th.bg[0]);
      const { px, lines } = fitText(ctx, c.title, titleFont, W - 260, layout === "minimal" ? 140 : 118, 72, 3);
      ctx.font = titleFont(px); drawLines(ctx, lines, W / 2, 900 + lift, px * 1.15, th.text, d.effect, th.accent);
      if (layout === "minimal") { ctx.fillStyle = th.accent; roundRect(ctx, W / 2 - 90, 900 + lift + lines.length * px * 1.15, 180, 12, 6); ctx.fill(); }
      if (c.desc) { ctx.globalAlpha = out * inB; ctx.font = bodyFont(46); drawLines(ctx, wrap(ctx, c.desc, W - 280, 2), W / 2, 1180 + lift, 64, th.sub, "none", th.accent); }
    } else if (layout === "number") {
      ctx.font = titleFont(420); ctx.fillStyle = `${th.accent}`; ctx.globalAlpha = out * inA * 0.9; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillText(String(seg.index + 1), 110, 820 + lift);
      ctx.globalAlpha = out * inA;
      const { px, lines } = fitText(ctx, c.title, titleFont, W - 220, 116, 70, 3);
      ctx.font = titleFont(px); drawLines(ctx, lines, 110, 1000 + lift, px * 1.15, th.text, d.effect, th.accent, "left");
      if (c.desc) { ctx.globalAlpha = out * inB; ctx.font = bodyFont(46); drawLines(ctx, wrap(ctx, c.desc, W - 220, 2), 110, 1040 + lift + lines.length * px * 1.15, 64, th.sub, "none", th.accent, "left"); }
    } else if (layout === "split") {
      ctx.fillStyle = th.accent; ctx.globalAlpha = out * inA * 0.92; ctx.fillRect(0, 0, W, 860 * inA);
      ctx.globalAlpha = out * inA;
      if (d.badges) { ctx.font = titleFont(220); ctx.fillStyle = th.bg[0]; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(tag, W / 2, 560); }
      const { px, lines } = fitText(ctx, c.title, titleFont, W - 200, 116, 70, 3);
      ctx.font = titleFont(px); drawLines(ctx, lines, W / 2, 1050 + lift, px * 1.15, th.text, d.effect, th.accent);
      if (c.desc) { ctx.globalAlpha = out * inB; ctx.font = bodyFont(46); drawLines(ctx, wrap(ctx, c.desc, W - 240, 2), W / 2, 1100 + lift + lines.length * px * 1.15, 64, th.sub, "none", th.accent); }
    } else { // bottom
      const grad = ctx.createLinearGradient(0, 1100, 0, H); grad.addColorStop(0, "rgba(0,0,0,0)"); grad.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx.fillStyle = grad; ctx.fillRect(0, 1100, W, H - 1100);
      if (d.badges) pill(ctx, tag, 210, 1130 + lift, bodyFont(42), th.accent, th.bg[0]);
      const { px, lines } = fitText(ctx, c.title, titleFont, W - 180, 112, 70, 3);
      ctx.font = titleFont(px); drawLines(ctx, lines, 100, 1250 + lift, px * 1.15, "#ffffff", d.effect, th.accent, "left");
      if (c.desc) { ctx.globalAlpha = out * inB; ctx.font = bodyFont(44); drawLines(ctx, wrap(ctx, c.desc, W - 200, 2), 100, 1290 + lift + lines.length * px * 1.15, 60, "#f1f5f9", "none", th.accent, "left"); }
    }
  }
  ctx.restore();
  ctx.save(); ctx.globalAlpha = out; drawCaption(ctx, s, seg, u, th.accent); ctx.restore();
  if (opts.safe) drawSafeArea(ctx);
}

/** 유튜브 쇼츠 UI가 덮는 영역(오른쪽 버튼·아래 제목/설명·위쪽 바) — 미리보기에만 그린다 */
export function drawSafeArea(ctx: CanvasRenderingContext2D) {
  ctx.save(); ctx.fillStyle = "rgba(239,68,68,0.22)"; ctx.strokeStyle = "rgba(239,68,68,0.9)"; ctx.lineWidth = 4; ctx.setLineDash([18, 12]);
  const zones: [number, number, number, number][] = [[0, 0, W, 160], [0, H - 420, W, 420], [W - 170, 760, 170, 740]];
  zones.forEach(([x, y, w, h]) => { ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h); });
  ctx.setLineDash([]); ctx.fillStyle = "#fff"; ctx.font = `700 34px "Noto Sans KR", sans-serif`; ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.fillText("유튜브 화면 가림 영역", 30, H - 400); ctx.restore();
}

/** 웹 글꼴은 글자 묶음(unicode-range)별로 나뉘어 받아진다 — 그리기 전에 대본에 실제로 쓰인 글자로 미리 불러온다(미리보기·MP4 공통) */
export async function loadFontsFor(s: ShortsScript, d: Design): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const text = Array.from(new Set([s.intro.eyebrow, s.intro.title, ...s.cards.flatMap((c) => [c.tag ?? "", c.title, c.desc]), s.outro.title, s.outro.subtitle, ...s.outro.cta, s.intro.narration, ...s.cards.map((c) => c.narration), s.outro.narration, "끝까지 보면 확실히 알게 됩니다 ↓ 구독 좋아요 0123456789", "유튜브 화면 가림 영역"].join(""))).join("");
  const f = FONTS[d.font];
  await Promise.all([
    document.fonts.load(`${f.weight} 64px "${f.family}"`, text),
    document.fonts.load(`700 40px "Noto Sans KR"`, text),
    document.fonts.load(`900 64px "Noto Sans KR"`, text),
    document.fonts.load(`800 58px "Noto Sans KR"`, text),
  ].map((p) => p.catch(() => [])));
}
