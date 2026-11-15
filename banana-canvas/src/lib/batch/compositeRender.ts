// 메이커 P1(2026-11-13) 「🛍 상품 대표사진 합성」 그리기 — 브라우저 전용. 위치 계산은 composite.ts(시험 대상).
// 사진 읽기·저장은 기존 「사진 일괄 손질」의 readBitmap·canvasToBlob을 그대로 쓴다(촬영·위치 정보는 결과에 남지 않음).
import { fitRect, mainBox, resolveSize, subRects, type CompositeSettings } from "./composite";

import { readBitmap as readBitmapRaw } from "./render";

export { canvasToBlob } from "./render";

/** 사진 읽기 — 깨졌거나 지원하지 않는 파일이면 브라우저의 영어 오류 대신 한국어 안내(파일 이름 포함)로 알린다 */
export async function readBitmap(file: Blob): Promise<ImageBitmap> {
  try {
    return await readBitmapRaw(file);
  } catch {
    const name = file instanceof File && file.name ? `「${file.name}」 ` : "";
    throw new Error(`${name}사진을 열 수 없습니다(깨졌거나 지원하지 않는 형식). 다른 파일로 바꿔 주세요.`);
  }
}

function roundedPath(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

/** 서브 틀 모양 경로(둥근 사각 또는 원) */
function shapePath(g: CanvasRenderingContext2D, r: { x: number; y: number; w: number; h: number }, s: CompositeSettings, inset = 0) {
  const x = r.x + inset, y = r.y + inset, w = r.w - inset * 2, h = r.h - inset * 2;
  if (s.subShape === "circle") {
    g.beginPath();
    g.arc(x + w / 2, y + h / 2, Math.max(0, Math.min(w, h) / 2), 0, Math.PI * 2);
    g.closePath();
  } else roundedPath(g, x, y, w, h, Math.max(0, s.subRadius - inset));
}

/**
 * 메인 1장 + 서브 0~3장 → 한 장(미리보기·저장 공용). scale<1이면 미리보기용 축소본.
 * sizeMode=original이면 메인 원본 크기로 그린다(실제 크기는 canvas.width/height 또는 resolveSize로 확인).
 */
export function renderComposite(main: ImageBitmap, subs: ImageBitmap[], settings: CompositeSettings, scale = 1): HTMLCanvasElement {
  const s: CompositeSettings = { ...settings, ...resolveSize(settings, main.width, main.height) };
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(s.width * scale));
  c.height = Math.max(1, Math.round(s.height * scale));
  const g = c.getContext("2d");
  if (!g) throw new Error("이 브라우저에서 그림을 그릴 수 없습니다.");
  g.scale(scale, scale);
  g.fillStyle = s.background;
  g.fillRect(0, 0, s.width, s.height);
  g.imageSmoothingQuality = "high";
  const m = fitRect(main.width, main.height, mainBox(s), s.fit);
  g.drawImage(main, m.sx, m.sy, m.sw, m.sh, m.dx, m.dy, m.dw, m.dh);

  const rects = subRects(subs.map((b) => b.width / Math.max(1, b.height)), s);
  subs.forEach((bm, i) => {
    const r = rects[i];
    if (!r) return;
    // 틀 하나를 따로 그린 뒤(모양대로 잘림·틀 배경·확대) 그 모양을 따라 그림자를 얹는다 — 투명 틀이어도 그림자가 사진 모양을 따른다
    const ow = Math.max(1, Math.ceil(r.w * scale)), oh = Math.max(1, Math.ceil(r.h * scale));
    const off = document.createElement("canvas");
    off.width = ow;
    off.height = oh;
    const og = off.getContext("2d");
    if (!og) return;
    og.scale(ow / r.w, oh / r.h);
    og.imageSmoothingQuality = "high";
    const local = { x: 0, y: 0, w: r.w, h: r.h };
    shapePath(og, local, s);
    og.clip();
    if (s.subFrameBg !== "transparent") {
      og.fillStyle = s.subFrameBg;
      og.fillRect(0, 0, r.w, r.h);
    }
    const d = fitRect(bm.width, bm.height, local, s.subFit, s.subZoom, s.subFocusX, s.subFocusY);
    og.drawImage(bm, d.sx, d.sy, d.sw, d.sh, d.dx, d.dy, d.dw, d.dh);

    g.save();
    if (s.subShadow) {
      g.shadowColor = "rgba(0,0,0,0.28)";
      g.shadowBlur = 18;
      g.shadowOffsetY = 6;
    }
    g.drawImage(off, r.x, r.y, r.w, r.h);
    g.restore();
    const lw = s.subOutline ? s.subOutlineWidth : 0;
    if (lw > 0) {
      g.save();
      shapePath(g, r, s, lw / 2);
      g.lineWidth = lw;
      g.strokeStyle = s.subOutlineColor;
      g.stroke();
      g.restore();
    }
  });
  return c;
}
