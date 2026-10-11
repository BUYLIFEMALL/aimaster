// 카드 한 장을 캔버스에 그린다. 화면 미리보기와 PNG 내보내기가 같은 함수를 쓰므로 결과가 같다.
// 글자 줄바꿈·배치 계산은 layout.ts(순수 함수)에 있다.
import { FONTS, RATIOS } from "./presets";
import { placeholderGradient } from "./defaults";
import type { CardPage, CardStyle, TextStyle } from "./types";

import { layoutBlock, luminance, type Measure } from "./layout";

export function ratioSize(ratio: string): { width: number; height: number } {
  const r = RATIOS.find((x) => x.value === ratio) ?? RATIOS[0];
  return { width: r.width, height: r.height };
}

export function fontFamily(fontId: CardStyle["font"]): string {
  return (FONTS.find((f) => f.value === fontId) ?? FONTS[0]).family;
}

function fontString(text: TextStyle, family: string): string {
  return `${text.weight} ${text.size}px ${family}`;
}

function drawCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, width: number, height: number) {
  const scale = Math.max(width / img.width, height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
}

export function drawCard(
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number },
  page: Pick<CardPage, "headline" | "sub">,
  style: CardStyle,
  bg: (CanvasImageSource & { width: number; height: number }) | null
) {
  const { width, height } = size;
  ctx.clearRect(0, 0, width, height);

  // 1) 배경: 생성된 이미지, 없으면 테마 색 그라데이션
  if (bg) {
    drawCover(ctx, bg, width, height);
  } else {
    const [a, b] = placeholderGradient(style.themeColor);
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  // 2) 글자를 읽기 좋게 하는 막: 밝은 글자면 검은 막, 어두운 글자면 흰 막
  if (style.bgOpacity > 0) {
    const light = luminance(style.headline.color) >= 0.5;
    ctx.fillStyle = light ? `rgba(0,0,0,${style.bgOpacity / 100})` : `rgba(255,255,255,${style.bgOpacity / 100})`;
    ctx.fillRect(0, 0, width, height);
  }

  // 3) 글자
  const family = fontFamily(style.font);
  const measure: Measure = (text, fontSize) => {
    ctx.font = `${style.headline.weight} ${fontSize}px ${family}`;
    return ctx.measureText(text).width;
  };
  const layout = layoutBlock(width, height, page.headline, page.sub, style, measure);

  ctx.textBaseline = "top";
  ctx.textAlign = layout.align;

  const drawLines = (lines: string[], text: TextStyle, startY: number, lineHeight: number) => {
    ctx.font = fontString(text, family);
    lines.forEach((line, i) => {
      const x = layout.x + text.dx;
      const y = startY + i * lineHeight + text.dy;
      if (style.displayStyle === "highlight" && line) {
        const w = ctx.measureText(line).width;
        const pad = Math.round(text.size * 0.18);
        const rectX = layout.align === "left" ? x - pad : x - w / 2 - pad;
        ctx.save();
        ctx.fillStyle = "rgba(255, 221, 0, 0.92)";
        ctx.fillRect(rectX, y + text.size * 0.05, w + pad * 2, text.size * 1.15);
        ctx.restore();
      }
      ctx.save();
      if (style.displayStyle === "shadow") {
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = Math.round(text.size * 0.3);
        ctx.shadowOffsetY = Math.round(text.size * 0.08);
      }
      if (style.displayStyle === "outline") {
        ctx.lineJoin = "round";
        ctx.lineWidth = Math.max(2, Math.round(text.size * 0.14));
        ctx.strokeStyle = luminance(text.color) >= 0.5 ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.9)";
        ctx.strokeText(line, x, y);
      }
      // 형광펜 위에서는 밝은 글자가 안 보이므로 어두운 글자로 바꾼다.
      ctx.fillStyle = style.displayStyle === "highlight" && luminance(text.color) >= 0.5 ? "#111111" : text.color;
      ctx.fillText(line, x, y);
      ctx.restore();
    });
  };

  drawLines(layout.headlineLines, style.headline, layout.top, layout.headlineLineHeight);
  drawLines(
    layout.subLines,
    style.sub,
    layout.top + layout.headlineLines.length * layout.headlineLineHeight + layout.gap,
    layout.subLineHeight
  );
}
