// PDF 만들기·합치기·나누기·추출·서명 찍기(pdf-lib, 브라우저·시험 공용). 파일은 서버로 보내지 않는다.
import { PDFDocument } from "pdf-lib";

export const A4_PT = { w: 595.28, h: 841.89 } as const;

/** 「1-3, 5, 8-」 같은 페이지 범위를 0부터 시작하는 번호 목록으로 바꾼다(중복 제거·순서 유지). */
export function parsePageRange(input: string, pageCount: number): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  const push = (n: number) => {
    if (n >= 1 && n <= pageCount && !seen.has(n)) {
      seen.add(n);
      out.push(n - 1);
    }
  };
  for (const raw of input.split(/[,，\s]+/)) {
    const part = raw.trim();
    if (!part) continue;
    const m = /^(\d*)\s*[-~]\s*(\d*)$/.exec(part);
    if (m) {
      const a = m[1] ? Number(m[1]) : 1;
      const b = m[2] ? Number(m[2]) : pageCount;
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      for (let n = lo; n <= hi; n += 1) push(n);
    } else if (/^\d+$/.test(part)) {
      push(Number(part));
    } else {
      throw new Error(`「${part}」은 페이지 번호로 읽을 수 없습니다. 예: 1-3, 5`);
    }
  }
  return out;
}

export interface ImageInput {
  bytes: Uint8Array;
  kind: "png" | "jpg";
  width: number;
  height: number;
}

/** 사진 여러 장 → PDF. fit: A4 한가운데 맞춤(여백 marginPt) / original: 사진 크기 그대로 한 장씩. */
export async function imagesToPdf(images: ImageInput[], mode: "a4" | "original" = "a4", marginPt = 24): Promise<Uint8Array> {
  if (!images.length) throw new Error("사진이 없습니다.");
  const doc = await PDFDocument.create();
  for (const img of images) {
    const embedded = img.kind === "png" ? await doc.embedPng(img.bytes) : await doc.embedJpg(img.bytes);
    if (mode === "original") {
      const page = doc.addPage([embedded.width, embedded.height]);
      page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
      continue;
    }
    const landscape = embedded.width > embedded.height;
    const pw = landscape ? A4_PT.h : A4_PT.w;
    const ph = landscape ? A4_PT.w : A4_PT.h;
    const page = doc.addPage([pw, ph]);
    const scale = Math.min((pw - marginPt * 2) / embedded.width, (ph - marginPt * 2) / embedded.height, 1e9);
    const w = embedded.width * scale;
    const h = embedded.height * scale;
    page.drawImage(embedded, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
  }
  return doc.save();
}

/** 여러 PDF를 순서대로 합친다. */
export async function mergePdfs(files: Uint8Array[]): Promise<Uint8Array> {
  if (!files.length) throw new Error("합칠 PDF가 없습니다.");
  const out = await PDFDocument.create();
  for (const bytes of files) {
    const src = await PDFDocument.load(bytes, { ignoreEncryption: false });
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return out.save();
}

/** 지정한 페이지(0부터)만 그 순서대로 새 PDF로 뽑는다. 순서 바꾸기·추출·삭제(남길 쪽만 지정)에 쓴다. */
export async function pickPages(bytes: Uint8Array, indices: number[]): Promise<Uint8Array> {
  if (!indices.length) throw new Error("남길 페이지가 없습니다.");
  const src = await PDFDocument.load(bytes);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, indices);
  pages.forEach((p) => out.addPage(p));
  return out.save();
}

/** n쪽씩 나눠 여러 PDF로 만든다. */
export async function splitEvery(bytes: Uint8Array, n: number): Promise<Uint8Array[]> {
  const size = Math.max(1, Math.floor(n));
  const src = await PDFDocument.load(bytes);
  const count = src.getPageCount();
  const parts: Uint8Array[] = [];
  for (let i = 0; i < count; i += size) {
    const idx = Array.from({ length: Math.min(size, count - i) }, (_, k) => i + k);
    parts.push(await pickPages(bytes, idx));
  }
  return parts;
}

export async function pageCountOf(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount();
}

/** 화면 비율 위치(왼쪽 위 기준 0~1)를 PDF 좌표(왼쪽 아래 기준, pt)로 바꾼다. */
export function toPdfBox(
  place: { x: number; y: number; w: number; h: number },
  page: { width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  const width = place.w * page.width;
  const height = place.h * page.height;
  return { x: place.x * page.width, y: page.height - place.y * page.height - height, width, height };
}

/** 서명 PNG를 지정 페이지(0부터, 비우면 전체)의 같은 비율 위치에 찍는다. */
export async function stampPng(
  bytes: Uint8Array,
  png: Uint8Array,
  place: { x: number; y: number; w: number; h: number },
  pages?: number[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const img = await doc.embedPng(png);
  const all = doc.getPages();
  const targets = pages && pages.length ? pages.filter((i) => i >= 0 && i < all.length) : all.map((_, i) => i);
  for (const i of targets) {
    const page = all[i];
    const { width, height } = page.getSize();
    page.drawImage(img, toPdfBox(place, { width, height }));
  }
  return doc.save();
}
