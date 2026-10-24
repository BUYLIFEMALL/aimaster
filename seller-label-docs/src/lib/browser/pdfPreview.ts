"use client";
// PDF 페이지 미리보기(pdfjs-dist 6.4.299, markdown-studio·document-translator와 같은 버전). 작업자 파일은 public/pdf/(빌드 전 자동 복사).
import * as pdfjs from "pdfjs-dist";

let ready = false;
function init() {
  if (!ready) {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf/pdf.worker.min.mjs";
    ready = true;
  }
}

export interface PdfPreview {
  pageCount: number;
  /** 페이지(0부터)를 가로 widthPx 그림으로 */
  render: (page: number, widthPx: number) => Promise<string>;
  /** 페이지 크기(pt) */
  size: (page: number) => Promise<{ width: number; height: number }>;
  destroy: () => void;
}

export async function openPdf(bytes: Uint8Array): Promise<PdfPreview> {
  init();
  // pdfjs는 넘긴 버퍼를 작업자로 옮겨 비우므로 사본을 넘긴다
  const task = pdfjs.getDocument({ data: bytes.slice() });
  const doc = await task.promise;
  return {
    pageCount: doc.numPages,
    async render(page, widthPx) {
      const p = await doc.getPage(page + 1);
      const base = p.getViewport({ scale: 1 });
      const viewport = p.getViewport({ scale: widthPx / base.width });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await p.render({ canvas, viewport }).promise;
      return canvas.toDataURL("image/jpeg", 0.8);
    },
    async size(page) {
      const p = await doc.getPage(page + 1);
      const v = p.getViewport({ scale: 1 });
      return { width: v.width, height: v.height };
    },
    destroy() {
      void task.destroy();
    },
  };
}

/** 암호가 걸린 PDF 등 열 수 없는 경우의 한국어 안내 */
export function pdfErrorMessage(e: unknown, name: string): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/password|encrypt/i.test(msg)) return `「${name}」은 암호가 걸린 PDF라 열 수 없습니다. 암호를 푼 뒤 넣어 주세요.`;
  return `「${name}」을 PDF로 읽지 못했습니다. 파일이 손상되었을 수 있습니다.`;
}
