// 내보내기 실행(브라우저). 문서마다 변환하고, 일부가 실패해도 성공한 파일은 전달하며 실패 목록을 정확히 돌려준다.
import { markdownToBlocks, mergeDocuments } from "./blocks";
import { type ExportDoc, localDateStamp, zipPaths } from "./collect";
import { type PageOptions, normalizePageOptions } from "./options";
import { buildHtmlDocument } from "./html";
import { safeFilename } from "../documents/model";

export type Format = "md" | "html" | "pdf" | "docx";
export type Mode = "merge" | "zip";
export const FORMAT_LABELS: Record<Format, string> = { md: "마크다운 (.md)", html: "HTML (.html)", pdf: "PDF (.pdf)", docx: "Word (.docx)" };
const MIME: Record<Format, string> = {
  md: "text/markdown;charset=utf-8", html: "text/html;charset=utf-8", pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export interface ExportResult { blob: Blob; filename: string; ok: number; failed: { name: string; error: string }[]; note?: string }
export interface ExportInput { docs: ExportDoc[]; format: Format; mode: Mode; options?: Partial<PageOptions>; title?: string; sanitize: (markdown: string) => string }

const message = (e: unknown) => e instanceof Error ? e.message : "알 수 없는 오류";
const stripExt = (n: string) => n.replace(/\.(md|markdown|txt)$/i, "");

/** 문서 하나를 지정 형식의 Blob으로 만든다 */
async function convertOne(doc: { name: string; markdown: string }, format: Format, options: Partial<PageOptions> | undefined, sanitize: (md: string) => string): Promise<Blob> {
  const title = stripExt(doc.name);
  if (format === "md") return new Blob([doc.markdown], { type: MIME.md });
  if (format === "html") return new Blob([buildHtmlDocument(title, [{ title, bodyHtml: sanitize(doc.markdown) }])], { type: MIME.html });
  const blocks = markdownToBlocks(doc.markdown);
  if (format === "pdf") { const { buildPdfDefinition, renderPdfBlob } = await import("./pdf"); return await renderPdfBlob(buildPdfDefinition(blocks, title, options)); }
  const { buildDocx, renderDocxBlob } = await import("./docx");
  return await renderDocxBlob(buildDocx(blocks, title, options));
}

async function convertMerged(docs: ExportDoc[], format: Format, options: Partial<PageOptions> | undefined, title: string, sanitize: (md: string) => string): Promise<Blob> {
  if (format === "md") return new Blob([docs.map(d => `# ${stripExt(d.name)}\n\n${d.markdown}`).join("\n\n---\n\n")], { type: MIME.md });
  if (format === "html") return new Blob([buildHtmlDocument(title, docs.map(d => ({ title: stripExt(d.name), bodyHtml: sanitize(d.markdown) })))], { type: MIME.html });
  const blocks = mergeDocuments(docs);
  if (format === "pdf") { const { buildPdfDefinition, renderPdfBlob } = await import("./pdf"); return await renderPdfBlob(buildPdfDefinition(blocks, title, options)); }
  const { buildDocx, renderDocxBlob } = await import("./docx");
  return await renderDocxBlob(buildDocx(blocks, title, options));
}

export async function runExport(input: ExportInput): Promise<ExportResult> {
  const { docs, format, mode, sanitize } = input;
  const options = input.options ? normalizePageOptions(input.options) : undefined;
  if (!docs.length) throw new Error("내보낼 문서가 없습니다. 폴더에 문서를 먼저 만들어 주세요.");
  const ext = format;
  if (docs.length === 1) {
    const blob = await convertOne(docs[0], format, options, sanitize);
    return { blob, filename: `${safeFilename(stripExt(docs[0].name))}.${ext}`, ok: 1, failed: [] };
  }
  const title = input.title || "문서 모음";
  if (mode === "merge") {
    const blob = await convertMerged(docs, format, options, title, sanitize);
    return { blob, filename: `${safeFilename(title)}.${ext}`, ok: docs.length, failed: [] };
  }
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const names = zipPaths(docs.map(d => d.path), ext);
  const failed: ExportResult["failed"] = [];
  let ok = 0;
  for (let i = 0; i < docs.length; i++) {
    try { zip.file(names[i], await convertOne(docs[i], format, options, sanitize)); ok++; }
    catch (e) { failed.push({ name: docs[i].path, error: message(e) }); }
  }
  if (!ok) throw new Error(`모든 문서의 변환에 실패했습니다. ${failed[0]?.error ?? ""}`);
  if (failed.length) zip.file("변환 실패 목록.txt", failed.map(f => `${f.name}: ${f.error}`).join("\n"));
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  return { blob, filename: `${safeFilename(title)}_${localDateStamp()}.zip`, ok, failed };
}
