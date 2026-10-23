import type { NextRequest } from "next/server";
import JSZip from "jszip";
import { guard, fail } from "@/lib/route";
import { db, projectFor, currentFor, assetsFor } from "@/lib/store";
import { articleHtml, escapeHtml, activeAssets } from "@/lib/content";
import { UserError } from "@/lib/errors";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export async function GET(req: NextRequest) { try {
  const { userId } = await guard(req), p = await projectFor(userId, req.nextUrl.searchParams.get("project")), r = await currentFor(userId, p), assets = activeAssets(await assetsFor(userId, p.id), r.data.media), format = req.nextUrl.searchParams.get("format") || "md";
  let body: string | Buffer = "", mime = "text/markdown; charset=utf-8", filename = "blog-content-maker.md";
  if (format === "md") body = `# ${r.data.title}\n\n${r.data.body}\n\n${r.data.tags.map(t => "#" + t).join(" ")}\n`;
  else if (format === "html") { body = `<!doctype html><html lang="ko"><meta charset="utf-8"><title>${escapeHtml(r.data.title)}</title><body>${articleHtml(r.data, assets)}</body></html>`; mime = "text/html; charset=utf-8"; filename = "blog-content-maker.html"; }
  else if (format === "zip") {
    const zip = new JSZip(); let html = articleHtml(r.data, assets);
    for (const a of assets) { const { data, error } = await db().storage.from("blog-content-maker").download(a.path); if (error || !data) throw new UserError(503, "이미지 파일을 읽지 못했습니다. 다운로드를 다시 요청해 주세요."); const file = `images/${a.id}.${a.path.split(".").pop()}`; zip.file(file, await data.arrayBuffer()); if (a.url) html = html.split(escapeHtml(a.url)).join(file); }
    zip.file("index.html", `<!doctype html><html lang="ko"><meta charset="utf-8"><title>${escapeHtml(r.data.title)}</title><body>${html}</body></html>`); zip.file("article.md", `# ${r.data.title}\n\n${r.data.body}`); zip.file("sources.json", JSON.stringify(r.data.sources, null, 2)); body = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }); mime = "application/zip"; filename = "blog-content-maker.zip";
  } else throw new UserError(400, "지원하지 않는 내보내기 형식입니다.");
  return new Response(typeof body === "string" ? body : new Uint8Array(body), { headers: { "Content-Type": mime, "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
} catch (e) { return fail(e); } }
