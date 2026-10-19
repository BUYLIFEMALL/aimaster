// 글자 줄바꿈·배치 계산(순수 함수). 캔버스 없이 자동 검사할 수 있게 render.ts에서 분리했다.
import type { CardStyle } from "./types";

export type Measure = (text: string, fontSize: number) => number;

/** 공백 기준으로 줄을 나누고, 한 단어가 너무 길면 글자 단위로 자른다. 빈 줄(\n)은 줄바꿈으로 존중한다. */
export function wrapText(text: string, maxWidth: number, fontSize: number, measure: Measure): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r/g, "").split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = "";
    const push = () => {
      if (current) lines.push(current);
      current = "";
    };
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measure(candidate, fontSize) <= maxWidth) {
        current = candidate;
        continue;
      }
      push();
      if (measure(word, fontSize) <= maxWidth) {
        current = word;
        continue;
      }
      // 한 단어가 한 줄보다 길면 글자 단위로 나눈다.
      let chunk = "";
      for (const ch of Array.from(word)) {
        if (measure(chunk + ch, fontSize) > maxWidth && chunk) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      current = chunk;
    }
    push();
  }
  return lines;
}

export interface BlockLayout {
  align: "left" | "center";
  x: number;
  headlineLines: string[];
  subLines: string[];
  headlineLineHeight: number;
  subLineHeight: number;
  gap: number;
  /** 글자가 시작하는 y(아이콘이 있으면 아이콘 아래) */
  top: number;
  /** 아이콘을 그릴 y(없으면 null) */
  iconTop: number | null;
  iconSize: number;
  height: number;
}

/** 배치(중앙/상단/하단/좌측)와 줄 수로 글자 블록의 위치를 계산한다. */
export function layoutBlock(
  width: number,
  height: number,
  headline: string,
  sub: string,
  style: Pick<CardStyle, "placement" | "headline" | "sub" | "icon">,
  measure: Measure,
  hasIcon = false
): BlockLayout {
  const left = style.placement === "left";
  const maxWidth = Math.round(width * (left ? 0.72 : 0.8));
  const headlineLines = headline.trim() ? wrapText(headline, maxWidth, style.headline.size, measure) : [];
  const subLines = sub.trim() ? wrapText(sub, maxWidth, style.sub.size, measure) : [];
  const headlineLineHeight = Math.round(style.headline.size * 1.25);
  const subLineHeight = Math.round(style.sub.size * 1.5);
  const gap = headlineLines.length && subLines.length ? Math.round(style.headline.size * 0.6) : 0;
  const iconSize = hasIcon && style.icon?.show ? style.icon.size : 0;
  const iconBlock = iconSize ? iconSize + Math.round(iconSize * 0.3) : 0;
  const blockHeight = iconBlock + headlineLines.length * headlineLineHeight + gap + subLines.length * subLineHeight;

  let top: number;
  if (style.placement === "top") top = Math.round(height * 0.1);
  else if (style.placement === "bottom") top = Math.round(height * 0.9 - blockHeight);
  else top = Math.round((height - blockHeight) / 2);

  const x = left ? Math.round(width * 0.09) : Math.round(width / 2);
  return {
    align: left ? "left" : "center",
    x,
    headlineLines,
    subLines,
    headlineLineHeight,
    subLineHeight,
    gap,
    top: top + iconBlock,
    iconTop: iconSize ? top : null,
    iconSize,
    height: blockHeight,
  };
}

/** 0(어두움)~1(밝음) 상대 밝기. 글자 색에 맞춰 배경 막 색을 고른다. */
export function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// ── 데이터형 레이아웃(v1.17): 번호 목록 · A vs B · 큰 숫자 ──────────────────────────────
// 배경형과 달리 글자 크기를 고정하고(항목이 많아도 작아지지 않게) 위쪽 제목 + 아래 내용 상자로 배치한다.

export const DATA_PAD = 0.074; // 좌우 여백(폭 대비, 1080 기준 80px)

/** 제목 아래~카드 90% 사이 남는 공간에 내용 블록을 가운데(약간 위, 2:3) 놓을 때의 시작 y */
export function centeredTop(height: number, headerBottom: number, blockHeight: number): number {
  const start = headerBottom + Math.round(height * 0.045);
  const room = Math.round(height * 0.9) - start;
  return room > blockHeight ? start + Math.round(((room - blockHeight) * 2) / 5) : start;
}

export interface DataHeader {
  x: number;
  top: number;
  lines: string[];
  size: number;
  lineHeight: number;
  /** 제목 블록 아래 끝 y */
  bottom: number;
}

/** 데이터형 공통 제목: 왼쪽 정렬, 최대 3줄, 글자 크기는 스타일 크기와 폭의 6.7%(1080 기준 72px) 중 작은 값 */
export function layoutDataHeader(width: number, height: number, headline: string, headlineSize: number, measure: Measure): DataHeader {
  const size = Math.min(headlineSize, Math.round(width * 0.067));
  const x = Math.round(width * DATA_PAD);
  const lines = headline.trim() ? wrapText(headline, width - x * 2, size, measure).slice(0, 3) : [];
  const lineHeight = Math.round(size * 1.22);
  const top = Math.round(height * 0.1);
  return { x, top, lines, size, lineHeight, bottom: top + lines.length * lineHeight };
}

export interface ListItemBox {
  y: number;
  height: number;
  titleLines: string[];
  descLines: string[];
}

export interface ListLayout {
  x: number;
  width: number;
  titleSize: number;
  descSize: number;
  badge: number;
  textX: number;
  padY: number;
  items: ListItemBox[];
  /** 아래 보조 문구 줄(공간이 남을 때만) */
  footLines: string[];
  footTop: number;
}

/** 번호 목록: 항목마다 둥근 상자(번호 배지 + 제목 + 설명). 상자 높이는 글자 줄 수에 맞춘다. */
export function layoutList(
  width: number,
  height: number,
  headerBottom: number,
  points: { title: string; desc: string }[],
  sub: string,
  measure: Measure
): ListLayout {
  const x = Math.round(width * DATA_PAD);
  const boxW = width - x * 2;
  const titleSize = Math.round(width * 0.037); // 1080 기준 40px
  const descSize = Math.round(width * 0.028); // 30px
  const badge = Math.round(width * 0.06);
  const padX = Math.round(width * 0.028);
  const padY = Math.round(width * 0.024);
  const textX = padX + badge + Math.round(width * 0.022);
  const textW = boxW - textX - padX;
  const gap = Math.round(width * 0.018);
  const sized = points.slice(0, 4).map((p) => {
    const titleLines = p.title.trim() ? wrapText(p.title, textW, titleSize, measure).slice(0, 2) : [];
    const descLines = p.desc.trim() ? wrapText(p.desc, textW, descSize, measure).slice(0, 3) : [];
    const textH =
      titleLines.length * Math.round(titleSize * 1.3) +
      (descLines.length ? Math.round(descSize * 0.35) : 0) +
      descLines.length * Math.round(descSize * 1.45);
    return { height: Math.max(badge, textH) + padY * 2, titleLines, descLines };
  });
  const footLineH = Math.round(descSize * 1.45);
  const footGuess = sub.trim() ? footLineH * Math.min(3, wrapText(sub, boxW, descSize, measure).length) + Math.round(height * 0.01) : 0;
  const total = sized.reduce((a, b) => a + b.height + gap, 0) + footGuess;
  let y = centeredTop(height, headerBottom, total);
  const items = sized.map((b) => {
    const box = { y, ...b };
    y += b.height + gap;
    return box;
  });
  const footTop = y + Math.round(height * 0.01);
  const fit = Math.max(0, Math.floor((Math.round(height * 0.93) - footTop) / footLineH));
  const footLines = sub.trim() ? wrapText(sub, boxW, descSize, measure).slice(0, Math.min(3, fit)) : [];
  return { x, width: boxW, titleSize, descSize, badge, textX, padY, items, footLines, footTop };
}

export interface VsColumn {
  x: number;
  width: number;
  titleLines: string[];
  descLines: string[];
}

export interface VsLayout {
  top: number;
  height: number;
  pad: number;
  titleSize: number;
  descSize: number;
  columns: [VsColumn, VsColumn];
  /** 두 칸 가운데 VS 원 */
  vsX: number;
  vsY: number;
  vsR: number;
  footX: number;
  footLines: string[];
  footTop: number;
}

/** A vs B: 좌우 두 칸(칸 제목 + 설명), 가운데 VS 원, 아래 결론(보조 문구) */
export function layoutVs(
  width: number,
  height: number,
  headerBottom: number,
  points: { title: string; desc: string }[],
  sub: string,
  measure: Measure
): VsLayout {
  const x = Math.round(width * DATA_PAD);
  const vsR = Math.round(width * 0.045);
  const gap = vsR * 2 + Math.round(width * 0.02); // VS 원이 칸 글자를 가리지 않게
  const colW = Math.round((width - x * 2 - gap) / 2);
  const titleSize = Math.round(width * 0.042);
  const descSize = Math.round(width * 0.031);
  const pad = Math.round(width * 0.03);
  const inner = colW - pad * 2;
  const two = [points[0] ?? { title: "", desc: "" }, points[1] ?? { title: "", desc: "" }];
  const columns = two.map((p, i) => ({
    x: x + i * (colW + gap),
    width: colW,
    titleLines: p.title.trim() ? wrapText(p.title, inner, titleSize, measure).slice(0, 2) : [],
    descLines: p.desc.trim() ? wrapText(p.desc, inner, descSize, measure).slice(0, 9) : [],
  })) as [VsColumn, VsColumn];
  const textH = Math.max(
    ...columns.map(
      (c) => c.titleLines.length * Math.round(titleSize * 1.3) + Math.round(descSize * 0.6) + c.descLines.length * Math.round(descSize * 1.45)
    )
  );
  const boxH = Math.min(Math.round(height * 0.55), Math.max(Math.round(height * 0.32), textH + pad * 2));
  const footLines = sub.trim() ? wrapText(sub, width - x * 2, descSize, measure).slice(0, 3) : [];
  const footH = footLines.length ? Math.round(height * 0.04) + footLines.length * Math.round(descSize * 1.45) : 0;
  const top = centeredTop(height, headerBottom, boxH + footH);
  const footTop = top + boxH + Math.round(height * 0.04);
  return {
    top,
    height: boxH,
    pad,
    titleSize,
    descSize,
    columns,
    vsX: Math.round(width / 2),
    vsY: top + Math.round(boxH / 2),
    vsR,
    footX: x,
    footLines,
    footTop,
  };
}

export interface NumberLayout {
  x: number;
  valueSize: number;
  valueY: number;
  labelLines: string[];
  labelSize: number;
  labelTop: number;
  footLines: string[];
  footSize: number;
  footTop: number;
}

/** 큰 숫자: 가운데 아주 큰 숫자, 그 아래 설명, 맨 아래 보조 문구. 숫자가 길면 폭에 맞춰 줄인다. */
export function layoutNumber(
  width: number,
  height: number,
  headerBottom: number,
  value: string,
  label: string,
  sub: string,
  measure: Measure
): NumberLayout {
  const x = Math.round(width * DATA_PAD);
  const maxW = width - x * 2;
  let valueSize = Math.round(width * 0.2); // 1080 기준 216px
  while (valueSize > 60 && measure(value || " ", valueSize) > maxW) valueSize -= 8;
  const labelSize = Math.round(width * 0.037);
  const footSize = Math.round(width * 0.028);
  const labelLines = label.trim() ? wrapText(label, maxW, labelSize, measure).slice(0, 2) : [];
  const footAll = sub.trim() ? wrapText(sub, maxW, footSize, measure).slice(0, 4) : [];
  const blockH = Math.round(valueSize * 1.08) + labelLines.length * Math.round(labelSize * 1.35) + (footAll.length ? Math.round(height * 0.05) + footAll.length * Math.round(footSize * 1.45) : 0);
  const valueY = centeredTop(height, headerBottom, blockH);
  const labelTop = valueY + Math.round(valueSize * 1.08);
  const footTop = labelTop + labelLines.length * Math.round(labelSize * 1.35) + Math.round(height * 0.05);
  const footLines = footAll;
  return { x, valueSize, valueY, labelLines, labelSize, labelTop, footLines, footSize, footTop };
}
