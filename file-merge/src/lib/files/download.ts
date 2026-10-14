// 브라우저 저장 도우미 — 결과는 서버로 보내지 않고 이 컴퓨터에서 바로 내려받는다.
import { createZip } from "./zip";

export function downloadBytes(bytes: Uint8Array | string, name: string, mime: string) {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10000);
}

/** 여러 파일은 ZIP 하나로(브라우저의 연속 다운로드 차단을 피한다) */
export function downloadZip(entries: { name: string; data: Uint8Array }[], zipName: string) {
  downloadBytes(createZip(entries), zipName, "application/zip");
}

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const CSV_MIME = "text/csv;charset=utf-8";
export const TXT_MIME = "text/plain;charset=utf-8";

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const readBytes = async (f: File) => new Uint8Array(await f.arrayBuffer());
