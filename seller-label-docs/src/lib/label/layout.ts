// A4 라벨지 칸 배치 계산(순수 함수 — 화면·인쇄·시험이 함께 쓴다). 단위는 모두 mm.
// 규격값은 원본 프로그램 표를 옮기지 않고 널리 쓰이는 A4 칸 크기에서 가운데 정렬로 계산한 추정값이다.
// 제조사 공식 여백과 다를 수 있으므로 화면에 「포장지 규격으로 확인·보정」 안내를 함께 보여 준다.

export const A4 = { w: 210, h: 297 } as const;

export interface LabelSheet {
  id: string;
  name: string;
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  marginTop: number;
  marginLeft: number;
  gapX: number;
  gapY: number;
  round?: boolean;
}

export interface CellRect {
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

const r1 = (n: number) => Math.round(n * 100) / 100;

/** 칸 크기·간격으로 A4 가운데에 오도록 위·왼쪽 여백을 계산한다. */
export function centeredSheet(
  id: string,
  name: string,
  cols: number,
  rows: number,
  cellW: number,
  cellH: number,
  gapX = 0,
  gapY = 0,
  round = false,
): LabelSheet {
  return {
    id,
    name,
    cols,
    rows,
    cellW,
    cellH,
    gapX,
    gapY,
    round,
    marginLeft: r1((A4.w - cols * cellW - (cols - 1) * gapX) / 2),
    marginTop: r1((A4.h - rows * cellH - (rows - 1) * gapY) / 2),
  };
}

/** 자주 쓰는 A4 라벨 칸 크기(가운데 정렬 추정값). 이름은 칸 수·칸 크기만 쓰고 제조사 제품 코드는 붙이지 않는다. */
export const SHEET_PRESETS: LabelSheet[] = [
  centeredSheet("a4-1", "1칸 · 199.6×289.1mm(전면)", 1, 1, 199.6, 289.1),
  centeredSheet("a4-2", "2칸 · 199.6×143.5mm", 1, 2, 199.6, 143.5, 0, 0),
  centeredSheet("a4-4", "4칸 · 99.1×139mm", 2, 2, 99.1, 139, 2.5, 0),
  centeredSheet("a4-6", "6칸 · 99.1×93.1mm", 2, 3, 99.1, 93.1, 2.5, 0),
  centeredSheet("a4-8", "8칸 · 99.1×67.7mm", 2, 4, 99.1, 67.7, 2.5, 0),
  centeredSheet("a4-10", "10칸 · 99.1×57mm", 2, 5, 99.1, 57, 2.5, 0),
  centeredSheet("a4-12", "12칸 · 63.5×72mm", 3, 4, 63.5, 72, 2.5, 0),
  centeredSheet("a4-14", "14칸 · 99.1×38.1mm", 2, 7, 99.1, 38.1, 2.5, 0),
  centeredSheet("a4-16", "16칸 · 99.1×33.9mm", 2, 8, 99.1, 33.9, 2.5, 0),
  centeredSheet("a4-18", "18칸 · 63.5×46.6mm", 3, 6, 63.5, 46.6, 2.5, 0),
  centeredSheet("a4-21", "21칸 · 63.5×38.1mm", 3, 7, 63.5, 38.1, 2.5, 0),
  centeredSheet("a4-24", "24칸 · 63.5×33.9mm", 3, 8, 63.5, 33.9, 2.5, 0),
  centeredSheet("a4-40", "40칸 · 48.5×25.4mm", 4, 10, 48.5, 25.4, 0, 0),
  centeredSheet("a4-65", "65칸 · 38.1×21.2mm", 5, 13, 38.1, 21.2, 2.5, 0),
  centeredSheet("a4-round12", "원형 12칸 · 지름 60mm", 3, 4, 60, 60, 5, 5, true),
  centeredSheet("a4-round20", "원형 20칸 · 지름 40mm", 4, 5, 40, 40, 7, 10, true),
];

export function totalCells(sheet: LabelSheet): number {
  return sheet.cols * sheet.rows;
}

/** 칸 좌표(왼쪽 위 기준, 한 줄씩 왼쪽→오른쪽). offset은 인쇄 위치 보정값(mm). */
export function cellRects(sheet: LabelSheet, offset = { dx: 0, dy: 0 }): CellRect[] {
  const out: CellRect[] = [];
  for (let row = 0; row < sheet.rows; row += 1) {
    for (let col = 0; col < sheet.cols; col += 1) {
      out.push({
        index: row * sheet.cols + col,
        x: r1(sheet.marginLeft + col * (sheet.cellW + sheet.gapX) + offset.dx),
        y: r1(sheet.marginTop + row * (sheet.cellH + sheet.gapY) + offset.dy),
        w: sheet.cellW,
        h: sheet.cellH,
      });
    }
  }
  return out;
}

/** 규격 입력 오류(종이를 벗어남·0 이하 값)를 한국어 문장으로 돌려준다. */
export function validateSheet(sheet: LabelSheet): string[] {
  const errors: string[] = [];
  const nums: [string, number][] = [
    ["가로 칸 수", sheet.cols],
    ["세로 칸 수", sheet.rows],
    ["칸 가로", sheet.cellW],
    ["칸 세로", sheet.cellH],
  ];
  for (const [label, v] of nums) if (!Number.isFinite(v) || v <= 0) errors.push(`${label}는 0보다 커야 합니다.`);
  if (!Number.isInteger(sheet.cols) || !Number.isInteger(sheet.rows)) errors.push("칸 수는 정수로 입력해 주세요.");
  for (const [label, v] of [["위 여백", sheet.marginTop], ["왼쪽 여백", sheet.marginLeft], ["가로 간격", sheet.gapX], ["세로 간격", sheet.gapY]] as [string, number][]) {
    if (!Number.isFinite(v) || v < 0) errors.push(`${label}는 0 이상이어야 합니다.`);
  }
  if (errors.length) return errors;
  const right = sheet.marginLeft + sheet.cols * sheet.cellW + (sheet.cols - 1) * sheet.gapX;
  const bottom = sheet.marginTop + sheet.rows * sheet.cellH + (sheet.rows - 1) * sheet.gapY;
  if (right > A4.w + 0.01) errors.push(`칸이 종이 오른쪽을 ${r1(right - A4.w)}mm 벗어납니다.`);
  if (bottom > A4.h + 0.01) errors.push(`칸이 종이 아래쪽을 ${r1(bottom - A4.h)}mm 벗어납니다.`);
  return errors;
}

/**
 * 내용 목록을 페이지별 칸에 나눈다. 첫 장은 startIndex(0부터) 칸부터 채운다(쓰다 남은 라벨지).
 * copies: 내용 하나당 몇 칸씩 반복할지. 빈 칸은 null.
 */
export function assignToPages<T>(perPage: number, items: T[], startIndex = 0, copies = 1): (T | null)[][] {
  const start = Math.max(0, Math.min(perPage - 1, Math.floor(startIndex)));
  const n = Math.max(1, Math.floor(copies));
  const flat: (T | null)[] = Array(start).fill(null);
  for (const item of items) for (let i = 0; i < n; i += 1) flat.push(item);
  if (flat.length === start) return [];
  const pages: (T | null)[][] = [];
  for (let i = 0; i < flat.length; i += perPage) {
    const page = flat.slice(i, i + perPage);
    while (page.length < perPage) page.push(null);
    pages.push(page);
  }
  return pages;
}

/** 「{열 이름}」 자리를 엑셀 행 값으로 바꾼다. 없는 열은 빈칸. */
export function fillTemplate(text: string, record: Record<string, unknown>): string {
  return text.replace(/\{([^{}]+)\}/g, (_, key: string) => {
    const v = record[key.trim()];
    return v == null ? "" : String(v);
  });
}
