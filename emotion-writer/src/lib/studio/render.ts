import { FONTS, ratioSize, type Design, type Ratio } from "./config";

export function wrapLines(
  quote: string,
  maxWidth: number,
  measure: (s: string) => number,
): string[] {
  const result: string[] = [];
  for (const paragraph of quote.split("\n")) {
    let line = "";
    for (const char of Array.from(paragraph)) {
      if (line && measure(line + char) > maxWidth) {
        result.push(line.trimEnd());
        line = char.trimStart();
      } else line += char;
    }
    result.push(line.trimEnd());
  }
  return result;
}
export function coverRect(
  iw: number,
  ih: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / iw, height / ih);
  return {
    x: (width - iw * scale) / 2,
    y: (height - ih * scale) / 2,
    width: iw * scale,
    height: ih * scale,
  };
}
export function drawQuote(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  image: HTMLImageElement,
  quote: string,
  design: Design,
) {
  const crop = coverRect(
    image.naturalWidth,
    image.naturalHeight,
    width,
    height,
  );
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height);
  ctx.fillStyle = `rgba(0,0,0,${design.overlay / 100})`;
  ctx.fillRect(0, 0, width, height);
  let size = design.size;
  let lines: string[] = [];
  while (size >= 18) {
    ctx.font = `${size}px "${design.font}"`;
    lines = wrapLines(
      quote,
      width * 0.82,
      (line) => ctx.measureText(line).width,
    );
    if (lines.length * size * 1.65 <= height * 0.7) break;
    size -= 2;
  }
  if (size < 18)
    throw new Error("문구가 너무 깁니다. 줄 수나 글자 수를 줄여 주세요.");
  const lineHeight = size * 1.65;
  const block = lines.length * lineHeight;
  const y =
    design.position === "top"
      ? height * 0.16
      : design.position === "bottom"
        ? height * 0.84 - block
        : (height - block) / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = design.color;
  ctx.shadowColor = "rgba(0,0,0,.5)";
  ctx.shadowBlur = 8;
  lines.forEach((line, i) => ctx.fillText(line, width / 2, y + i * lineHeight));
  if (design.signature) {
    ctx.font = `${Math.min(size * 0.6, 34)}px "${design.font}"`;
    ctx.fillText(design.signature, width / 2, height * 0.92, width * 0.82);
  }
  ctx.shadowBlur = 0;
}
export async function renderQuote(
  canvas: HTMLCanvasElement,
  imageUrl: string,
  quote: string,
  ratio: Ratio,
  design: Design,
) {
  return renderQuoteAt(canvas, imageUrl, quote, ratioSize(ratio), design);
}

/** 크기를 직접 받아 그린다(v1.18 「다른 크기로 받기」 — renderQuote도 이 함수를 쓴다) */
export async function renderQuoteAt(
  canvas: HTMLCanvasElement,
  imageUrl: string,
  quote: string,
  size: { width: number; height: number },
  design: Design,
) {
  if (!FONTS.some((f) => f.id === design.font))
    throw new Error("지원하는 글꼴을 선택해 주세요.");
  // Fonts ship with this app: wait for the exact Korean face before drawing or exporting.
  const loaded = await document.fonts.load(
    `${design.size}px "${design.font}"`,
    quote || "감성 글귀",
  );
  if (!loaded.length)
    throw new Error(
      "글꼴을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.",
    );
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("배경 이미지를 불러오지 못했습니다."));
    img.src = imageUrl;
  });
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이 브라우저에서는 이미지를 만들 수 없습니다.");
  drawQuote(ctx, size.width, size.height, image, quote, design);
}
export function canvasBlob(canvas: HTMLCanvasElement, format: "png" | "jpeg") {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) =>
        b ? resolve(b) : reject(new Error("저장 파일을 만들지 못했습니다.")),
      `image/${format}`,
      0.95,
    ),
  );
}
