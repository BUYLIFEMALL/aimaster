// 가사 영상 한 장 그리기 — 미리보기와 MP4 내보내기가 같은 함수를 쓴다(보이는 그대로 파일로 나옴).
// 크기는 1080 기준 단위(u)로 잡아 미리보기(축소)와 내보내기(1080p)가 같은 비율로 그려진다.
import { FONTS, type Design } from "@/lib/design";
import { formatTime, lineAt, type LyricLine } from "@/lib/lyrics";
import { smoothBandsAt, waveAt, type AudioSource } from "@/lib/render/spectrum";

export interface Scene {
  title: string; artist: string;
  /** timeline()으로 정리한 줄(시간 있는 줄만, 시작 순서) */
  lines: LyricLine[];
  duration: number;
  design: Design;
  cover: (CanvasImageSource & { width: number; height: number }) | null;
  /** 커버가 바뀌면 바뀌는 값(흐린 배경 캐시 키) */
  coverKey: string;
  audio: AudioSource | null;
}
export interface DrawCache { backdrop?: { key: string; canvas: HTMLCanvasElement } }

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const ease = (k: number) => 1 - Math.pow(1 - k, 3);

function lum(hex: string) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
const fontOf = (d: Design, px: number, weight?: number) => `${weight ?? FONTS[d.font].weight} ${Math.round(px)}px "${FONTS[d.font].family}", "Noto Sans KR", "Malgun Gothic", sans-serif`;

/** 화면에 쓸 글꼴을 미리 받아 둔다(받지 못해도 기본 글꼴로 그려진다) */
export async function ensureFonts(d: Design): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const f = FONTS[d.font];
  await Promise.all([
    document.fonts.load(`${f.weight} 64px "${f.family}"`, "가나다ABC"),
    document.fonts.load(`700 64px "Noto Sans KR"`, "가나다ABC"),
  ].map((p) => p.catch(() => undefined)));
}

function coverFit(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height), iw = img.width * s, ih = img.height * s;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

function background(ctx: CanvasRenderingContext2D, W: number, H: number, sc: Scene, t: number, u: number, cache: DrawCache) {
  const d = sc.design;
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, d.bg1); g.addColorStop(1, d.bg2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (sc.cover && d.coverBackdrop) {
    const key = `${W}x${H}:${sc.coverKey}`;
    if (cache.backdrop?.key !== key) {
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const x = c.getContext("2d")!;
      x.filter = `blur(${Math.round(42 * u)}px) saturate(1.15)`;
      coverFit(x, sc.cover, -W * 0.08, -H * 0.08, W * 1.16, H * 1.16);
      x.filter = "none"; x.fillStyle = "rgba(0,0,0,0.5)"; x.fillRect(0, 0, W, H);
      cache.backdrop = { key, canvas: c };
    }
    ctx.drawImage(cache.backdrop.canvas, 0, 0);
  }
  if (d.ambient > 0) { // 천천히 떠다니는 빛 세 개(시간으로만 정해져 프레임마다 같은 값)
    const blobs = [[0.22, 0.3, 0.11, 0.07], [0.78, 0.62, 0.08, 0.13], [0.5, 0.9, 0.05, 0.09]];
    for (const [bx, by, sx, sy] of blobs) {
      const cx = W * (bx + 0.12 * Math.sin(t * sx * 2 + bx * 9)), cy = H * (by + 0.1 * Math.cos(t * sy * 2 + by * 7)), r = Math.max(W, H) * 0.45;
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, rgba(d.accent, 0.22 * d.ambient)); rg.addColorStop(1, rgba(d.accent, 0));
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    }
  }
}

function drawCover(ctx: CanvasRenderingContext2D, sc: Scene, x: number, y: number, s: number, u: number) {
  const d = sc.design, r = 18 * u;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 40 * u; ctx.shadowOffsetY = 14 * u;
  ctx.beginPath(); ctx.roundRect(x, y, s, s, r); ctx.fillStyle = d.bg2; ctx.fill();
  ctx.shadowColor = "transparent"; ctx.clip();
  if (sc.cover) coverFit(ctx, sc.cover, x, y, s, s);
  else { // 커버가 없으면 색과 첫 글자로 만든 앨범 아트
    const g = ctx.createLinearGradient(x, y, x + s, y + s); g.addColorStop(0, d.accent); g.addColorStop(1, d.bg2);
    ctx.fillStyle = g; ctx.fillRect(x, y, s, s);
    ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.font = fontOf(d, s * 0.42, 900); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(Array.from(sc.title.trim() || "♪")[0], x + s / 2, y + s / 2);
  }
  ctx.restore();
}

function drawTitle(ctx: CanvasRenderingContext2D, sc: Scene, x: number, y: number, maxW: number, align: CanvasTextAlign, u: number, scale = 1) {
  const d = sc.design;
  ctx.save(); ctx.textAlign = align; ctx.textBaseline = "alphabetic"; ctx.fillStyle = d.text;
  ctx.font = fontOf(d, 36 * u * scale, 700); ctx.fillText(sc.title || "제목 없음", x, y, maxW);
  if (sc.artist) { ctx.globalAlpha = 0.7; ctx.font = fontOf(d, 26 * u * scale, 400); ctx.fillText(sc.artist, x, y + 40 * u * scale, maxW); }
  ctx.restore();
}

function drawSpectrum(ctx: CanvasRenderingContext2D, sc: Scene, t: number, x: number, y: number, w: number, h: number, u: number) {
  const d = sc.design; if (d.spectrum === "none") return;
  ctx.save(); ctx.fillStyle = d.accent; ctx.strokeStyle = d.accent;
  if (d.spectrum === "wave") {
    const pts = waveAt(sc.audio, t, 160);
    ctx.lineWidth = 3 * u; ctx.lineJoin = "round"; ctx.beginPath();
    pts.forEach((v, i) => { const px = x + (i / (pts.length - 1)) * w, py = y + h / 2 - clamp(v * 1.6, -1, 1) * (h / 2); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
    ctx.stroke(); ctx.restore(); return;
  }
  const n = d.spectrum === "mirror" ? 24 : 40, bands = smoothBandsAt(sc.audio, t, n);
  const cols = d.spectrum === "mirror" ? n * 2 : n, bw = w / cols, gap = bw * 0.32;
  for (let i = 0; i < cols; i++) {
    const v = d.spectrum === "mirror" ? bands[i < n ? n - 1 - i : i - n] : bands[i];
    const bh = Math.max(3 * u, v * h);
    const bx = x + i * bw + gap / 2;
    if (d.spectrum === "mirror") ctx.fillRect(bx, y + (h - bh) / 2, bw - gap, bh);
    else { ctx.beginPath(); ctx.roundRect(bx, y + h - bh, bw - gap, bh, Math.min(4 * u, (bw - gap) / 2)); ctx.fill(); }
  }
  ctx.restore();
}

function drawProgress(ctx: CanvasRenderingContext2D, sc: Scene, t: number, x: number, y: number, w: number, u: number) {
  const d = sc.design; if (!d.progress) return;
  const k = sc.duration > 0 ? clamp(t / sc.duration) : 0, h = 6 * u;
  ctx.save();
  ctx.fillStyle = rgba(d.text, 0.2); ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = d.accent; ctx.beginPath(); ctx.roundRect(x, y, Math.max(h, w * k), h, h / 2); ctx.fill();
  ctx.fillStyle = rgba(d.text, 0.7); ctx.font = fontOf(d, 20 * u, 400); ctx.textBaseline = "top";
  ctx.textAlign = "left"; ctx.fillText(formatTime(t, false), x, y + 14 * u);
  ctx.textAlign = "right"; ctx.fillText(formatTime(sc.duration, false), x + w, y + 14 * u);
  ctx.restore();
}

/** 글자 폭에 맞춰 최대 2줄로 나눈다(띄어쓰기 우선, 없으면 글자 단위). 그래도 넘치면 글자를 줄인다 */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const rows: string[] = [];
  for (const para of text.split("\n")) {
    let cur = "";
    for (const word of para.split(/(\s+)/)) {
      const next = cur + word;
      if (ctx.measureText(next).width <= maxW || !cur.trim()) { cur = next; continue; }
      rows.push(cur.trim()); cur = word.trimStart();
    }
    if (cur.trim()) rows.push(cur.trim());
  }
  // 띄어쓰기 없는 긴 줄은 글자 단위로 자른다
  const out: string[] = [];
  for (const r of rows) {
    if (ctx.measureText(r).width <= maxW) { out.push(r); continue; }
    let cur = ""; for (const ch of Array.from(r)) { if (ctx.measureText(cur + ch).width > maxW && cur) { out.push(cur); cur = ch; } else cur += ch; } if (cur) out.push(cur);
  }
  return out.length ? out : [""];
}

interface Block { rows: string[]; px: number; widths: number[] }
function layoutLine(ctx: CanvasRenderingContext2D, d: Design, text: string, px: number, maxW: number): Block {
  let size = px;
  for (let tries = 0; tries < 6; tries++) {
    ctx.font = fontOf(d, size);
    const rows = wrap(ctx, text, maxW);
    if (rows.length <= 2 || tries === 5) return { rows: rows.slice(0, 3), px: size, widths: rows.slice(0, 3).map((r) => ctx.measureText(r).width) };
    size *= 0.88;
  }
  return { rows: [text], px: size, widths: [ctx.measureText(text).width] };
}

function drawLyrics(ctx: CanvasRenderingContext2D, sc: Scene, t: number, rx: number, cy: number, rw: number, basePx: number, u: number) {
  const d = sc.design, tl = sc.lines; if (!tl.length) return;
  const { index, gap } = lineAt(tl, t);
  const step = index >= 0 ? ease(clamp((t - tl[index].start) / 0.35)) : 0;
  const focus = index >= 0 ? index - 1 + step : -1;
  const ctxN = d.context, lineGap = basePx * (ctxN > 0 ? 2.5 : 2);
  const lightText = lum(d.text) > 0.5;
  const from = Math.max(0, Math.floor(focus) - ctxN - 1), to = Math.min(tl.length - 1, Math.ceil(focus) + ctxN + 1);
  for (let i = from; i <= to; i++) {
    const dist = i - focus, ad = Math.abs(dist);
    const fade = clamp(ctxN + 1 - ad); if (fade <= 0.01) continue;
    const active = i === index && !gap && ad < 0.5;
    const k = clamp(ad), scale = lerp(1, 0.7, k);
    const blk = layoutLine(ctx, d, tl[i].text, basePx * scale, rw);
    const rowH = blk.px * 1.25, blockH = rowH * blk.rows.length, top = cy + dist * lineGap - blockH / 2;
    const left = d.align === "center" ? rx + rw / 2 : rx;
    const maxRowW = Math.max(...blk.widths);
    const boxX = d.align === "center" ? left - maxRowW / 2 : left;
    const p = active ? clamp((t - tl[i].start) / Math.max(0.2, tl[i].end - tl[i].start)) : 0;
    ctx.save();
    ctx.globalAlpha = fade * (active ? 1 : lerp(0.85, 0.38, k) * (gap && i === index ? 0.8 : 1));
    ctx.font = fontOf(d, blk.px); ctx.textBaseline = "middle"; ctx.textAlign = d.align === "center" ? "center" : "left";
    if (lightText) { ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 14 * u; }
    let fill = d.text;
    if (active) {
      const padX = 22 * u, padY = 10 * u;
      ctx.save(); ctx.shadowColor = "transparent";
      if (d.highlight === "box") { ctx.fillStyle = d.accent; ctx.beginPath(); ctx.roundRect(boxX - padX, top - padY, maxRowW + padX * 2, blockH + padY * 2, 14 * u); ctx.fill(); }
      if (d.highlight === "outline") { ctx.strokeStyle = d.accent; ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.roundRect(boxX - padX, top - padY, maxRowW + padX * 2, blockH + padY * 2, 14 * u); ctx.stroke(); }
      if (d.highlight === "bar") { ctx.fillStyle = d.accent; ctx.beginPath(); ctx.roundRect(boxX - 30 * u, top, 8 * u, blockH, 4 * u); ctx.fill(); }
      if (d.highlight === "marker" || d.highlight === "underline") {
        let used = 0; const total = blk.widths.reduce((a, b) => a + b, 0) || 1;
        blk.rows.forEach((_, r) => {
          const w = blk.widths[r], x0 = d.align === "center" ? left - w / 2 : left, yMid = top + rowH * (r + 0.5);
          if (d.highlight === "marker") { ctx.fillStyle = rgba(d.accent, 0.45); ctx.fillRect(x0 - 6 * u, yMid + blk.px * 0.05, w + 12 * u, blk.px * 0.42); }
          else { const part = clamp((p * total - used) / w); ctx.fillStyle = d.accent; ctx.fillRect(x0, yMid + blk.px * 0.58, w * part, 5 * u); }
          used += w;
        });
      }
      ctx.restore();
      if (d.highlight === "color") fill = d.accent;
      if (d.highlight === "box") { fill = lum(d.accent) > 0.55 ? "#0b0b14" : "#ffffff"; ctx.shadowColor = "transparent"; }
    }
    blk.rows.forEach((row, r) => { ctx.fillStyle = fill; ctx.fillText(row, left, top + rowH * (r + 0.5)); });
    if (active && d.highlight === "karaoke") { // 부른 만큼 강조색으로 덮어 그린다(줄이 여러 개면 위에서부터 차례로)
      let used = 0; const total = blk.widths.reduce((a, b) => a + b, 0) || 1;
      blk.rows.forEach((row, r) => {
        const w = blk.widths[r], x0 = d.align === "center" ? left - w / 2 : left, part = clamp((p * total - used) / w);
        if (part > 0) { ctx.save(); ctx.beginPath(); ctx.rect(x0 - 4 * u, top + rowH * r, w * part + 4 * u, rowH); ctx.clip(); ctx.fillStyle = d.accent; ctx.fillText(row, left, top + rowH * (r + 0.5)); ctx.restore(); }
        used += w;
      });
    }
    ctx.restore();
  }
}

/** t초 화면 한 장 */
export function drawFrame(ctx: CanvasRenderingContext2D, W: number, H: number, sc: Scene, t: number, cache: DrawCache) {
  const d = sc.design, u = Math.min(W, H) / 1080, size = d.size;
  ctx.save(); ctx.clearRect(0, 0, W, H);
  background(ctx, W, H, sc, t, u, cache);
  if (d.aspect === "landscape") {
    if (d.layout === "panel") {
      const s = Math.min(H * 0.46, W * 0.27), cx = W * 0.08, cy = H * 0.5 - s / 2 - H * 0.08;
      drawCover(ctx, sc, cx, cy, s, u);
      if (d.showTitle) drawTitle(ctx, sc, cx, cy + s + 56 * u, s, "left", u);
      drawSpectrum(ctx, sc, t, cx, cy + s + (d.showTitle ? 110 : 40) * u, s, 70 * u, u);
      drawProgress(ctx, sc, t, cx, cy + s + (d.showTitle ? 210 : 140) * u, s, u);
      drawLyrics(ctx, sc, t, W * 0.46, H * 0.5, W * 0.47, 56 * u * size, u);
    } else {
      if (d.showTitle) drawTitle(ctx, sc, 70 * u, 90 * u, W * 0.5, "left", u, 0.85);
      drawLyrics(ctx, sc, t, W * 0.1, H * 0.47, W * 0.8, 64 * u * size, u);
      drawSpectrum(ctx, sc, t, W * 0.25, H - 190 * u, W * 0.5, 80 * u, u);
      drawProgress(ctx, sc, t, 70 * u, H - 80 * u, W - 140 * u, u);
    }
  } else {
    if (d.layout === "panel") {
      const s = W * 0.6, cx = (W - s) / 2, cy = H * 0.1;
      drawCover(ctx, sc, cx, cy, s, u);
      if (d.showTitle) drawTitle(ctx, sc, W / 2, cy + s + 70 * u, W * 0.84, "center", u, 1.1);
      drawLyrics(ctx, sc, t, W * 0.07, H * 0.67, W * 0.86, 62 * u * size, u);
      drawSpectrum(ctx, sc, t, W * 0.15, H - 290 * u, W * 0.7, 90 * u, u);
      drawProgress(ctx, sc, t, W * 0.1, H - 160 * u, W * 0.8, u);
    } else {
      if (d.showTitle) drawTitle(ctx, sc, W / 2, 200 * u, W * 0.84, "center", u, 1.1);
      drawLyrics(ctx, sc, t, W * 0.07, H * 0.5, W * 0.86, 66 * u * size, u);
      drawSpectrum(ctx, sc, t, W * 0.15, H - 290 * u, W * 0.7, 90 * u, u);
      drawProgress(ctx, sc, t, W * 0.1, H - 160 * u, W * 0.8, u);
    }
  }
  ctx.restore();
}
