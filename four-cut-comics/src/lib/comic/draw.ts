// 브라우저 Canvas 합성. 순수 계산은 script.ts(wrapText 등)에 있고 여기는 그리기만 한다.
import { hasDialogue, lineFor, showsSpeaker, wrapText } from "./script";
import type { Panel } from "./script";
import { SCALE, fitText, rotatePoint, textAreaRatio } from "./balloon";
import type { Balloon, BalloonShape } from "./balloon";
import { isBalloonMode } from "./options";
import { stackLayout } from "./extras";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    img.src = src;
  });
}

function context(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("캔버스를 만들 수 없습니다.");
  return ctx;
}

export function fontSizeFor(width: number): number { return Math.max(16, Math.round(width * 0.04)); }
const FONT = (px: number, extra = "") => `${extra}bold ${px}px 'Noto Sans KR', 'Malgun Gothic', sans-serif`;

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 한 줄 앞의 `이름: ` 부분만 주황색으로 그린다 */
function drawLine(ctx: CanvasRenderingContext2D, line: string, x: number, y: number, speaker: string | null) {
  const prefix = speaker ? `${speaker}: ` : "";
  if (prefix && line.startsWith(prefix)) {
    ctx.fillStyle = "#F97316";
    ctx.fillText(prefix, x, y);
    ctx.fillStyle = "#000000";
    ctx.fillText(line.slice(prefix.length), x + ctx.measureText(prefix).width, y);
  } else {
    ctx.fillStyle = "#000000";
    ctx.fillText(line, x, y);
  }
}

/** 말풍선 테두리 모양(타원 둘레의 점들). 외침은 뾰족하게, 생각은 구름처럼 둥근 혹을 붙인다. */
function outlineParts(shape: BalloonShape, rx: number, ry: number): ((ctx: CanvasRenderingContext2D) => void)[] {
  if (shape === "shout") {
    const n = 22;
    return [(ctx) => {
      ctx.beginPath();
      for (let k = 0; k <= n * 2; k++) {
        const a = (k / (n * 2)) * Math.PI * 2;
        const f = k % 2 === 0 ? 1.08 : 0.86;
        const px = Math.cos(a) * rx * f;
        const py = Math.sin(a) * ry * f;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }];
  }
  const body = (ctx: CanvasRenderingContext2D) => { ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); };
  if (shape === "speech") return [body];
  const bumps = 12;
  const br = Math.min(rx, ry) * 0.32;
  return [body, ...Array.from({ length: bumps }, (_, k) => (ctx: CanvasRenderingContext2D) => {
    const a = (k / bumps) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * rx * 0.88, Math.sin(a) * ry * 0.88, br, 0, Math.PI * 2);
  })];
}

/** 꼬리 모양(말풍선 중심 좌표계). 생각은 작아지는 동그라미 3개, 나머지는 삼각형. */
function tailParts(shape: BalloonShape, tip: { x: number; y: number }, rx: number, ry: number): ((ctx: CanvasRenderingContext2D) => void)[] {
  const len = Math.hypot(tip.x, tip.y);
  if (len < 1) return [];
  const ux = tip.x / len;
  const uy = tip.y / len;
  if (shape === "thought") {
    const edge = 1 / Math.hypot(ux / rx, uy / ry); // 이 방향으로 타원 테두리까지의 거리
    const r0 = Math.min(rx, ry) * 0.16;
    return [0.35, 0.65, 0.95].map((t, k) => (ctx: CanvasRenderingContext2D) => {
      const d = edge + (len - edge) * t;
      ctx.beginPath();
      ctx.arc(ux * d, uy * d, Math.max(3, r0 * (1 - k * 0.3)), 0, Math.PI * 2);
    });
  }
  const half = Math.min(rx, ry) * 0.28;
  const base = { x: ux * rx * 0.6, y: uy * ry * 0.6 };
  return [(ctx) => {
    ctx.beginPath();
    ctx.moveTo(base.x - uy * half, base.y + ux * half);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(base.x + uy * half, base.y - ux * half);
    ctx.closePath();
  }];
}

/**
 * 말풍선 하나를 그린다(W×H 캔버스, 좌표는 0~1000 정규화 값). 미리보기 오버레이와 저장 합성이 같은 함수를 쓴다.
 * 모든 조각의 테두리를 두껍게 먼저 그리고 흰색으로 채워, 겹친 부분 안쪽 선은 지우고 바깥 윤곽만 남긴다.
 */
export function drawBalloon(ctx: CanvasRenderingContext2D, W: number, H: number, b: Balloon, text: string) {
  const sx = W / SCALE;
  const sy = H / SCALE;
  const cx = (b.x + b.w / 2) * sx;
  const cy = (b.y + b.h / 2) * sy;
  const rx = (b.w / 2) * sx;
  const ry = (b.h / 2) * sy;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((b.rotation * Math.PI) / 180);
  let parts = outlineParts(b.shape, rx, ry);
  if (b.tail) {
    // 꼬리 끝은 화면 좌표로 고정되어 있으므로, 회전한 좌표계 안의 위치로 되돌려 계산한다
    const local = rotatePoint({ x: b.tail.x * sx, y: b.tail.y * sy }, { x: cx, y: cy }, -b.rotation);
    parts = [...parts, ...tailParts(b.shape, { x: local.x - cx, y: local.y - cy }, rx, ry)];
  }
  const lw = Math.max(2, Math.min(W, H) * 0.005);
  ctx.lineJoin = "round";
  ctx.strokeStyle = b.color;
  ctx.lineWidth = lw * 2;
  for (const p of parts) { p(ctx); ctx.stroke(); }
  ctx.fillStyle = "#ffffff";
  for (const p of parts) { p(ctx); ctx.fill(); }

  const ratio = textAreaRatio(b.shape);
  const boxW = rx * 2 * ratio;
  const boxH = ry * 2 * ratio;
  const maxPx = Math.max(12, Math.min(W, H) * 0.06);
  const minPx = Math.max(9, Math.min(W, H) * 0.022);
  const measure = (px: number, t: string) => { ctx.font = FONT(px); return ctx.measureText(t).width; };
  const wrap = (px: number, t: string, mw: number) => { ctx.font = FONT(px); return wrapText((s) => ctx.measureText(s).width, t, mw).map((l) => l.trim()); };
  const fit = fitText(measure, wrap, text, boxW, boxH, maxPx, minPx);
  ctx.font = FONT(fit.px);
  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lh = fit.px * 1.25;
  const top = -((fit.lines.length - 1) * lh) / 2;
  fit.lines.forEach((l, i) => ctx.fillText(l, 0, top + i * lh));
  ctx.restore();
}

/** 컷 그림 위에 대사를 합성한 PNG 데이터 URL. 대사가 없으면 그림 그대로. balloon은 ai·manual 방식에서만 쓴다. */
export async function composePanel(imageUrl: string, panel: Panel, bubbleId: string, balloon?: Balloon | null): Promise<string> {
  const img = await loadImage(imageUrl);
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = context(c);
  ctx.drawImage(img, 0, 0);
  if (!hasDialogue(panel)) return c.toDataURL("image/png");
  if (isBalloonMode(bubbleId)) {
    if (balloon) drawBalloon(ctx, c.width, c.height, balloon, panel.dialogue.trim());
    return c.toDataURL("image/png");
  }

  const W = c.width;
  const H = c.height;
  const fs = fontSizeFor(W);
  const pad = W * 0.04;
  const lh = fs * 1.3;
  const text = bubbleId === "narration" ? panel.dialogue.trim() : lineFor(panel);
  const speaker = showsSpeaker(panel) && bubbleId !== "narration" ? panel.character : null;
  ctx.textBaseline = "top";

  if (bubbleId === "narration") {
    ctx.font = FONT(fs, "italic ");
    const lines = wrapText((t) => ctx.measureText(t).width, text, W - pad * 3);
    const bw = W - pad * 2;
    const bh = lines.length * lh + pad;
    ctx.fillStyle = "rgba(255, 250, 205, 0.9)";
    ctx.fillRect(pad, pad, bw, bh);
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = Math.max(2, fs / 10);
    ctx.strokeRect(pad, pad, bw, bh);
    ctx.textAlign = "center";
    ctx.fillStyle = "#000000";
    lines.forEach((l, i) => ctx.fillText(l.trim(), W / 2, pad + pad / 2 + i * lh));
    return c.toDataURL("image/png");
  }

  ctx.font = FONT(fs);
  if (bubbleId === "cinematic") {
    const lines = wrapText((t) => ctx.measureText(t).width, text, W - pad * 2);
    const top = H - pad - lines.length * lh;
    ctx.textAlign = "left";
    ctx.lineJoin = "round";
    ctx.lineWidth = fs / 5;
    ctx.strokeStyle = "#000000";
    ctx.fillStyle = "#ffffff";
    lines.forEach((l, i) => { ctx.strokeText(l.trim(), pad, top + i * lh); ctx.fillText(l.trim(), pad, top + i * lh); });
    return c.toDataURL("image/png");
  }

  // simple · webtoon: 아래쪽 상자
  const lines = wrapText((t) => ctx.measureText(t).width, text, W - pad * 3);
  const bw = W - pad * 2;
  const bh = lines.length * lh + pad;
  const by = H - bh - pad;
  if (bubbleId === "webtoon") {
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = "#ffffff";
    roundRectPath(ctx, pad, by, bw, bh, 15);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = Math.max(2, fs / 10);
    roundRectPath(ctx, pad, by, bw, bh, 15);
    ctx.stroke();
  } else {
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.fillRect(pad, by, bw, bh);
  }
  ctx.textAlign = "left";
  lines.forEach((l, i) => drawLine(ctx, l.trim(), pad + pad / 2, by + pad / 2 + i * lh, speaker));
  return c.toDataURL("image/png");
}

export type SaveLayout = "grid" | "horizontal" | "vertical";

/** 합성된 컷들을 한 장으로 이어 붙인 PNG 데이터 URL */
export async function layoutPanels(urls: string[], layout: SaveLayout): Promise<string> {
  const imgs = await Promise.all(urls.map(loadImage));
  const cw = imgs[0].naturalWidth;
  const ch = imgs[0].naturalHeight;
  const cols = layout === "grid" ? 2 : layout === "horizontal" ? imgs.length : 1;
  const rows = Math.ceil(imgs.length / cols);
  const gap = Math.round(cw * 0.02);
  const c = document.createElement("canvas");
  c.width = cols * cw + (cols + 1) * gap;
  c.height = rows * ch + (rows + 1) * gap;
  const ctx = context(c);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);
  imgs.forEach((im, i) => {
    const x = gap + (i % cols) * (cw + gap);
    const y = gap + Math.floor(i / cols) * (ch + gap);
    ctx.drawImage(im, x, y, cw, ch);
  });
  return c.toDataURL("image/png");
}

/** 이미지 여러 장을 세로로 이어 한 장으로(만화 합치기). 흰 배경 PNG 데이터 URL */
export async function stackImages(urls: string[], gapRatio = 0.02): Promise<string> {
  const imgs = await Promise.all(urls.map(loadImage));
  const width = Math.min(1600, Math.max(...imgs.map((i) => i.naturalWidth)));
  const plan = stackLayout(imgs.map((i) => ({ w: i.naturalWidth, h: i.naturalHeight })), { gap: Math.round(width * gapRatio) });
  const c = document.createElement("canvas");
  c.width = plan.width;
  c.height = plan.height;
  const ctx = context(c);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);
  imgs.forEach((im, i) => { const r = plan.rects[i]; ctx.drawImage(im, r.x, r.y, r.w, r.h); });
  return c.toDataURL("image/png");
}

/** 이미지를 긴 변 maxEdge 이하 JPEG 데이터 URL로(내 작품 보관용 용량 절약) */
export async function toJpeg(url: string, maxEdge = 1400, quality = 0.85): Promise<string> {
  const img = await loadImage(url);
  const s = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.naturalWidth * s));
  c.height = Math.max(1, Math.round(img.naturalHeight * s));
  const ctx = context(c);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
}

/** 사용자가 고른 이미지 파일을 데이터 URL로 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error(`파일을 읽지 못했습니다: ${file.name}`));
    r.readAsDataURL(file);
  });
}

/** 캐릭터 시트를 서버로 보낼 때 긴 변 768px JPEG로 줄인다(요청 크기 한도) */
export async function shrinkForUpload(dataUrl: string, maxEdge = 768): Promise<{ data: string; mimeType: string }> {
  const img = await loadImage(dataUrl);
  const s = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.naturalWidth * s));
  c.height = Math.max(1, Math.round(img.naturalHeight * s));
  const ctx = context(c);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return { data: c.toDataURL("image/jpeg", 0.85).split(",")[1], mimeType: "image/jpeg" };
}

/** 사용자가 올린 이미지 파일을 PNG 데이터 URL로(긴 변 1024px 제한) */
export async function fileToSheet(file: File): Promise<string> {
  const url = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error(`파일을 읽지 못했습니다: ${file.name}`));
    r.readAsDataURL(file);
  });
  const img = await loadImage(url);
  const s = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.naturalWidth * s));
  c.height = Math.max(1, Math.round(img.naturalHeight * s));
  context(c).drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/png");
}

export function downloadUrl(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
