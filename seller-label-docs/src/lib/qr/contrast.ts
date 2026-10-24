// QR 색 대비 검사(순수 함수). 휴대폰 카메라가 읽으려면 「진한 점 + 밝은 바탕」에 대비가 충분해야 한다.

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

export type ContrastLevel = "good" | "warn" | "bad";

/** 점 색(fg)과 바탕 색(bg)으로 읽힘 정도를 판정한다. */
export function judgeQrContrast(fg: string, bg: string): { level: ContrastLevel; ratio: number; message: string } {
  const ratio = contrastRatio(fg, bg);
  if (relativeLuminance(fg) > relativeLuminance(bg)) {
    return { level: "bad", ratio, message: "점 색이 바탕보다 밝습니다. 일부 휴대폰은 반전된 QR을 읽지 못하니 진한 점 + 밝은 바탕으로 바꿔 주세요." };
  }
  if (ratio >= 7) return { level: "good", ratio, message: "대비가 충분합니다." };
  if (ratio >= 4) return { level: "warn", ratio, message: "읽히지만 조명·인쇄 상태에 따라 실패할 수 있습니다. 더 진한 점 색을 권장합니다." };
  return { level: "bad", ratio, message: "대비가 부족해 휴대폰이 읽지 못할 수 있습니다. 점 색을 더 진하게 하거나 바탕을 밝게 해 주세요." };
}
