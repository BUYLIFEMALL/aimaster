"use client";

export interface ZipEntry {
  name: string;
  blob: Blob;
}

/** 파일 여러 개를 ZIP 하나로 묶는다(브라우저에서만 처리, 서버로 보내지 않는다). jszip은 필요할 때만 불러온다. */
export async function buildZip(entries: ZipEntry[]): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const e of entries) zip.file(e.name, e.blob);
  // PNG는 이미 압축된 형식이라 보관(STORE)만 해서 속도를 높인다.
  return zip.generateAsync({ type: "blob", compression: "STORE" });
}
