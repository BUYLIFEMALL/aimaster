import { type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { json } from "@/lib/aiRoute";
import { createDocument, deleteDocument, isUuid, listDocuments, loadDocument, updateDocument } from "@/lib/documents";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function readBody(request: NextRequest): Promise<Record<string, unknown>> {
  const raw = await request.text();
  if (raw.length > 300_000) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch { return {}; }
}

/** GET /api/documents → 목록, GET ?id=… → 1건(본문 포함) */
export async function GET(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    if (!isUuid(id)) return json({ error: "문서 번호가 올바르지 않습니다." }, 400);
    const doc = await loadDocument(access.user.id, id);
    return doc ? json({ document: doc }) : json({ error: "문서를 찾을 수 없습니다." }, 404);
  }
  return json({ documents: await listDocuments(access.user.id) });
}

/** POST: 새 문서 {title?, content, format, sources?} */
export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const body = await readBody(request);
  if (typeof body.content !== "string") return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
  const doc = await createDocument(access.user.id, body);
  return doc ? json({ document: doc }) : json({ error: "문서를 저장하지 못했습니다." }, 500);
}

/** PUT: 자동 저장 {id, title?, content, format, sources?} — 본인 문서만 */
export async function PUT(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const body = await readBody(request);
  if (!isUuid(body.id) || typeof body.content !== "string") return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
  const doc = await updateDocument(access.user.id, body.id, body);
  return doc ? json({ document: { id: doc.id, title: doc.title, updated_at: doc.updated_at } }) : json({ error: "문서를 찾을 수 없습니다." }, 404);
}

export async function DELETE(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const id = request.nextUrl.searchParams.get("id");
  if (!isUuid(id)) return json({ error: "문서 번호가 올바르지 않습니다." }, 400);
  const ok = await deleteDocument(access.user.id, id);
  return ok ? json({ success: true }) : json({ error: "삭제하지 못했습니다." }, 500);
}
