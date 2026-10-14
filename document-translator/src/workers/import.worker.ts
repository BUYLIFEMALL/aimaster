import * as pdfjs from "pdfjs-dist";
import mammoth from "mammoth";
import { unzipSync } from "fflate";
import { inspectDocxZip } from "../lib/translation/zip";
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "/pdf/pdf.worker.min.mjs",
  globalThis.location.href,
).href;
const length = (s: string) => Array.from(s).length;
globalThis.onmessage = async (
  event: MessageEvent<{ buffer: ArrayBuffer; name: string }>,
) => {
  try {
    const { buffer, name } = event.data,
      ext = name.split(".").pop()?.toLowerCase();
    if (buffer.byteLength > 5 * 1024 * 1024)
      throw new Error("파일은 5MB까지 불러올 수 있습니다.");
    let text = "",
      html = "";
    if (ext === "txt")
      text = new TextDecoder("utf-8", { fatal: true })
        .decode(buffer)
        .replace(/^\uFEFF/, "");
    else if (ext === "docx") {
      const bytes = new Uint8Array(buffer),
        entries = inspectDocxZip(bytes),
        files = unzipSync(bytes);
      if (entries.some((e) => (files[e.name]?.length ?? 0) !== e.size))
        throw new Error("DOCX의 압축 크기 정보가 일치하지 않습니다.");
      const result = await mammoth.convertToHtml(
        { arrayBuffer: buffer },
        {
          externalFileAccess: false,
          convertImage: mammoth.images.imgElement(async () => ({
            src: "",
            alt: "",
          })),
        },
      );
      html = result.value;
      if (new TextEncoder().encode(html).length > 1024 * 1024)
        throw new Error("문서 내용이 큽니다. 나누어 불러와주세요.");
    } else if (ext === "pdf") {
      const start = new TextDecoder().decode(
        new Uint8Array(buffer).subarray(0, 1024),
      );
      if (!start.includes("%PDF-"))
        throw new Error("올바른 PDF 파일이 아닙니다.");
      const base = new URL("/pdf/", globalThis.location.href).href;
      // The PDF.js display API normally reads window/document when creating a worker.
      // Supply a real nested worker and explicit asset fetching inside this import worker.
      const port = new Worker(pdfjs.GlobalWorkerOptions.workerSrc, {
        type: "module",
      });
      pdfjs.GlobalWorkerOptions.workerPort = port;
      const task = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        cMapUrl: `${base}cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `${base}standard_fonts/`,
        wasmUrl: `${base}wasm/`,
        useWorkerFetch: true,
        disableFontFace: true,
      });
      try {
        const pdf = await task.promise;
        if (pdf.numPages > 50)
          throw new Error("PDF는 50페이지까지 불러올 수 있습니다.");
        for (let p = 1; p <= pdf.numPages; p++) {
          globalThis.postMessage({
            progress: `${p}/${pdf.numPages}페이지 읽는 중`,
          });
          const page = await pdf.getPage(p),
            content = await page.getTextContent();
          let previousY: number | null = null;
          for (const item of content.items)
            if ("str" in item) {
              const y = item.transform[5];
              if (previousY !== null && Math.abs(y - previousY) > 2)
                text += "\n";
              text += item.str + (item.hasEOL ? "\n" : " ");
              previousY = y;
            }
          text += "\n\n";
          if (length(text) > 20_000)
            throw new Error(
              "추출한 원문이 20,000자를 넘습니다. PDF를 나누어주세요.",
            );
          page.cleanup();
        }
      } finally {
        try {
          await task.destroy();
        } finally {
          port.terminate();
          pdfjs.GlobalWorkerOptions.workerPort = null;
        }
      }
    } else throw new Error("TXT, PDF, DOCX 파일만 불러올 수 있습니다.");
    if (!html && !text.trim())
      throw new Error(
        "텍스트를 찾지 못했습니다. 스캔 PDF는 텍스트 PDF로 변환한 뒤 불러와주세요.",
      );
    if (length(text) > 20_000)
      throw new Error(
        "추출한 원문이 20,000자를 넘습니다. 문서를 나누어주세요.",
      );
    globalThis.postMessage({ text, html });
  } catch (e) {
    const message = e instanceof Error ? e.message : "문서를 읽지 못했습니다.";
    globalThis.postMessage({
      error: /encoded data|encoding/.test(message)
        ? "UTF-8 텍스트 파일로 저장한 뒤 불러와주세요."
        : /password|Password/.test(message)
          ? "암호가 걸린 PDF는 잠금을 해제한 뒤 불러와주세요."
          : message.startsWith("문서") || /[가-힣]/.test(message)
            ? message
            : "파일이 손상됐거나 지원하지 않는 문서입니다.",
    });
  }
};
