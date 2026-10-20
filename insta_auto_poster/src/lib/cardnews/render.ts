// 카드 한 장을 캔버스에 그린다. 화면 미리보기와 PNG 내보내기가 같은 함수를 쓰므로 결과가 같다.
// 글자 줄바꿈·배치 계산은 layout.ts(순수 함수)에 있다.
import { FONTS, RATIOS, dataAccent } from "./presets";
import { ICON_PATHS } from "./iconData";
import { placeholderGradient } from "./defaults";
import type { CardContent, CardStyle, TextStyle } from "./types";

import { layoutBlock, layoutDataHeader, layoutList, layoutNumber, layoutVs, luminance, type Measure } from "./layout";

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
  page: CardContent,
  style: CardStyle,
  bg: (CanvasImageSource & { width: number; height: number }) | null
) {
  const { width, height } = size;
  ctx.clearRect(0, 0, width, height);
  if (page.layout && page.layout !== "background") {
    drawDataCard(ctx, size, page, style, bg);
    return;
  }

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
  const iconPaths = page.icon ? ICON_PATHS[page.icon] : undefined;
  const layout = layoutBlock(width, height, page.headline, page.sub, style, measure, !!iconPaths);

  // 아이콘: 24×24 선 아이콘을 헤드라인 글자 색으로 글자 위에 그린다.
  if (iconPaths && layout.iconTop !== null && style.icon) {
    const scale = layout.iconSize / 24;
    const cx = layout.align === "left" ? layout.x + layout.iconSize / 2 : layout.x;
    ctx.save();
    ctx.translate(cx - layout.iconSize / 2 + style.icon.dx, layout.iconTop + style.icon.dy);
    ctx.scale(scale, scale);
    ctx.strokeStyle = style.headline.color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (style.displayStyle === "shadow") {
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = layout.iconSize * 0.12;
      ctx.shadowOffsetY = layout.iconSize * 0.03;
    }
    for (const d of iconPaths) ctx.stroke(new Path2D(d));
    ctx.restore();
  }

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


// ── 데이터형 카드(v1.17): 번호 목록 · A vs B · 큰 숫자 ──────────────────────────────
// 어두운 막 위에 흰 글자로 고정해 읽기 쉽게 하고, 강조색(디자인 테마 색, 자동=주황 — v1.20)으로 번호·숫자·VS를 칠한다.
const BOX_FILL = "rgba(255,255,255,0.08)";
const BOX_LINE = "rgba(255,255,255,0.16)";
const TEXT_MAIN = "#ffffff";
const TEXT_SUB = "#c9ced8";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawDataCard(
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number },
  page: CardContent,
  style: CardStyle,
  bg: (CanvasImageSource & { width: number; height: number }) | null
) {
  const { width, height } = size;
  const A = dataAccent(style.themeColor);
  const ACCENT = A.main;
  // 1) 배경: 이미지가 있으면 깔고 진한 막(최소 70%), 없으면 짙은 차콜 그라데이션
  if (bg) {
    drawCover(ctx, bg, width, height);
    ctx.fillStyle = `rgba(10,12,16,${Math.max(70, style.bgOpacity) / 100})`;
    ctx.fillRect(0, 0, width, height);
  } else {
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, "#0f1115");
    g.addColorStop(1, "#1d1a1f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  const family = fontFamily(style.font);
  const measureAt = (weight: number): Measure => (t, fontSize) => {
    ctx.font = `${weight} ${fontSize}px ${family}`;
    return ctx.measureText(t).width;
  };
  const text = (t: string, x: number, y: number, weight: number, sizePx: number, color: string, align: CanvasTextAlign = "left") => {
    ctx.font = `${weight} ${sizePx}px ${family}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(t, x, y);
  };
  ctx.textBaseline = "top";

  // 2) 제목(공통) + 강조 밑줄
  const header = layoutDataHeader(width, height, page.headline, style.headline.size, measureAt(900));
  header.lines.forEach((line, i) => text(line, header.x, header.top + i * header.lineHeight, 900, header.size, TEXT_MAIN));
  if (header.lines.length) {
    ctx.fillStyle = ACCENT;
    ctx.fillRect(header.x, header.bottom + Math.round(header.size * 0.18), Math.round(width * 0.09), Math.max(4, Math.round(width * 0.006)));
  }

  const points = page.points ?? [];
  if (page.layout === "list") {
    const L = layoutList(width, height, header.bottom, points, page.sub, measureAt(800));
    L.items.forEach((it, i) => {
      roundRect(ctx, L.x, it.y, L.width, it.height, Math.round(width * 0.024));
      ctx.fillStyle = i === 0 ? `rgba(${A.mainRgb},0.12)` : BOX_FILL;
      ctx.fill();
      ctx.strokeStyle = i === 0 ? `rgba(${A.mainRgb},0.45)` : BOX_LINE;
      ctx.lineWidth = 2;
      ctx.stroke();
      const bx = L.x + Math.round(width * 0.028);
      const by = it.y + L.padY;
      roundRect(ctx, bx, by, L.badge, L.badge, Math.round(L.badge * 0.28));
      ctx.fillStyle = `rgba(${A.mainRgb},0.18)`;
      ctx.fill();
      text(String(i + 1).padStart(2, "0"), bx + L.badge / 2, by + Math.round(L.badge * 0.22), 900, Math.round(L.badge * 0.5), ACCENT, "center");
      let ty = it.y + L.padY;
      it.titleLines.forEach((line) => {
        text(line, L.x + L.textX, ty, 800, L.titleSize, TEXT_MAIN);
        ty += Math.round(L.titleSize * 1.3);
      });
      if (it.descLines.length) ty += Math.round(L.descSize * 0.35);
      it.descLines.forEach((line) => {
        text(line, L.x + L.textX, ty, 500, L.descSize, TEXT_SUB);
        ty += Math.round(L.descSize * 1.45);
      });
    });
    L.footLines.forEach((line, i) => text(line, L.x, L.footTop + i * Math.round(L.descSize * 1.45), 600, L.descSize, TEXT_SUB));
    return;
  }

  if (page.layout === "vs") {
    const V = layoutVs(width, height, header.bottom, points, page.sub, measureAt(800));
    V.columns.forEach((c, i) => {
      roundRect(ctx, c.x, V.top, c.width, V.height, Math.round(width * 0.026));
      ctx.fillStyle = i === 0 ? `rgba(${A.altRgb},0.10)` : `rgba(${A.mainRgb},0.10)`;
      ctx.fill();
      ctx.strokeStyle = i === 0 ? `rgba(${A.altRgb},0.45)` : `rgba(${A.mainRgb},0.45)`;
      ctx.lineWidth = 2;
      ctx.stroke();
      let ty = V.top + V.pad;
      c.titleLines.forEach((line) => {
        text(line, c.x + V.pad, ty, 900, V.titleSize, i === 0 ? A.alt : ACCENT);
        ty += Math.round(V.titleSize * 1.3);
      });
      ty += Math.round(V.descSize * 0.6);
      c.descLines.forEach((line) => {
        if (ty + V.descSize < V.top + V.height - V.pad / 2) text(line, c.x + V.pad, ty, 500, V.descSize, TEXT_MAIN);
        ty += Math.round(V.descSize * 1.45);
      });
    });
    ctx.beginPath();
    ctx.arc(V.vsX, V.vsY, V.vsR, 0, Math.PI * 2);
    ctx.fillStyle = "#0f1115";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = TEXT_MAIN;
    ctx.stroke();
    ctx.textBaseline = "middle";
    text("VS", V.vsX, V.vsY + 2, 900, Math.round(V.vsR * 0.8), TEXT_MAIN, "center");
    ctx.textBaseline = "top";
    V.footLines.forEach((line, i) => text(line, V.footX, V.footTop + i * Math.round(V.descSize * 1.45), 600, V.descSize, TEXT_SUB));
    return;
  }

  // 큰 숫자
  const value = page.number?.value ?? "";
  const N = layoutNumber(width, height, header.bottom, value, page.number?.label ?? "", page.sub, measureAt(900));
  text(value, N.x, N.valueY, 900, N.valueSize, ACCENT);
  N.labelLines.forEach((line, i) => text(line, N.x, N.labelTop + i * Math.round(N.labelSize * 1.35), 800, N.labelSize, TEXT_MAIN));
  N.footLines.forEach((line, i) => text(line, N.x, N.footTop + i * Math.round(N.footSize * 1.45), 500, N.footSize, TEXT_SUB));
}
