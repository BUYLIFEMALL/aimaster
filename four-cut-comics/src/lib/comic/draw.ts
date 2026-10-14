// 브라우저 Canvas 합성. 순수 계산은 script.ts(wrapText 등)에 있고 여기는 그리기만 한다.
import { hasDialogue, lineFor, showsSpeaker, wrapText } from "./script";
import type { Panel } from "./script";

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

/** 컷 그림 위에 대사를 합성한 PNG 데이터 URL. 대사가 없으면 그림 그대로. */
export async function composePanel(imageUrl: string, panel: Panel, bubbleId: string): Promise<string> {
  const img = await loadImage(imageUrl);
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = context(c);
  ctx.drawImage(img, 0, 0);
  if (!hasDialogue(panel)) return c.toDataURL("image/png");

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
