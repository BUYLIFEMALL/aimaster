// 메이커 P1(2026-11-13) 「🛍 상품 대표사진 합성」 그리기 — 브라우저 전용. 위치 계산은 composite.ts(시험 대상).
// 사진 읽기·저장은 기존 「사진 일괄 손질」의 readBitmap·canvasToBlob을 그대로 쓴다(촬영·위치 정보는 결과에 남지 않음).
import { fitRect, mainBox, subRects, type CompositeSettings } from "./composite";

export { readBitmap, canvasToBlob } from "./render";

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

/** 메인 1장 + 서브 0~3장 → 한 장(미리보기·저장 공용). scale<1이면 미리보기용 축소본 */
export function renderComposite(main: ImageBitmap, subs: ImageBitmap[], s: CompositeSettings, scale = 1): HTMLCanvasElement {
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
    g.save();
    if (s.subShadow) {
      g.shadowColor = "rgba(0,0,0,0.28)";
      g.shadowBlur = 18;
      g.shadowOffsetY = 6;
      roundedPath(g, r.x, r.y, r.w, r.h, s.subRadius);
      g.fillStyle = "#ffffff";
      g.fill();
      g.shadowColor = "transparent";
    }
    roundedPath(g, r.x, r.y, r.w, r.h, s.subRadius);
    g.clip();
    g.drawImage(bm, 0, 0, bm.width, bm.height, r.x, r.y, r.w, r.h);
    g.restore();
    if (s.subOutline) {
      g.save();
      roundedPath(g, r.x + 1, r.y + 1, r.w - 2, r.h - 2, s.subRadius);
      g.lineWidth = 2;
      g.strokeStyle = "#ffffff";
      g.stroke();
      g.restore();
    }
  });
  return c;
}
