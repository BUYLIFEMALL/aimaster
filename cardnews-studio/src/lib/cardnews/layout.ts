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
