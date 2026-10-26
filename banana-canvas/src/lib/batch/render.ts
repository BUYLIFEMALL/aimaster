// E4(2026-10-26) 「🖼 사진 일괄 손질」 그리기 — 브라우저 전용.
// 사진을 createImageBitmap(사진 방향 반영)으로 읽어 캔버스에 새로 그린 뒤 저장하므로
// 촬영 정보·GPS·기기 정보(EXIF·XMP·IPTC)는 결과 파일에 들어가지 않는다.
import { anchorPosition, logoSize, outputSize, textFontPx, type BatchSettings } from "./layout";

export async function readBitmap(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

export interface RenderInput {
  bitmap: ImageBitmap;
  settings: BatchSettings;
  logo?: ImageBitmap | null;
}

/** 결과 캔버스를 만든다(미리보기·저장 공용) */
export function renderToCanvas({ bitmap, settings: s, logo }: RenderInput): HTMLCanvasElement {
  const size = outputSize(bitmap.width, bitmap.height, s);
  const c = document.createElement("canvas");
  c.width = size.totalW;
  c.height = size.totalH;
  const g = c.getContext("2d");
  if (!g) throw new Error("이 브라우저에서 그림을 그릴 수 없습니다.");
  if (s.format === "jpg" || s.border > 0) {
    g.fillStyle = s.border > 0 ? s.borderColor : "#ffffff"; // JPG는 투명한 부분을 흰색으로
    g.fillRect(0, 0, c.width, c.height);
  }
  g.imageSmoothingQuality = "high";
  g.drawImage(bitmap, s.border, s.border, size.w, size.h);

  g.globalAlpha = s.wmOpacity / 100;
  if (s.wmKind === "logo" && logo) {
    const ls = logoSize(c.width, logo.width, logo.height, s.wmSizePct);
    const p = anchorPosition(s.wmAnchor, c.width, c.height, ls.w, ls.h, s.wmMargin);
    g.drawImage(logo, p.x, p.y, ls.w, ls.h);
  } else if (s.wmKind === "text" && s.wmText.trim()) {
    const px = textFontPx(c.width, s.wmSizePct);
    g.font = `${s.wmBold ? "800" : "500"} ${px}px "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
    g.textBaseline = "top";
    const text = s.wmText.trim();
    const tw = Math.ceil(g.measureText(text).width);
    const p = anchorPosition(s.wmAnchor, c.width, c.height, tw, px, s.wmMargin);
    // 밝은·어두운 사진 모두에서 보이도록 옅은 그림자
    g.shadowColor = "rgba(0,0,0,0.35)";
    g.shadowBlur = Math.max(2, Math.round(px / 12));
    g.fillStyle = s.wmColor;
    g.fillText(text, p.x, p.y);
  }
  g.globalAlpha = 1;
  return c;
}

export function canvasToBlob(c: HTMLCanvasElement, s: Pick<BatchSettings, "format" | "quality">): Promise<Blob> {
  const type = s.format === "png" ? "image/png" : "image/jpeg";
  return new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("저장하지 못했습니다."))), type, s.format === "png" ? undefined : s.quality / 100));
}
