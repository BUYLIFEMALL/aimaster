import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { contentHash, requireAdmin, ROLE_ID_RE } from "@/lib/devDocs/admin";
import { fetchRepoText, isAllowedDocPath } from "@/lib/devDocs/github";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MAX_CONTENT = 400 * 1024;
const MAX_NOTE = 20000;
const LIST_COLUMNS = "id, kind, target_path, target_role, note, status, handled_by, commit_sha, reject_reason, handled_at, created_at";

/** GET — 요청 목록(최근 200개). ?id= 이면 수정본 원문까지 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const service = createServiceClient();

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const { data, error } = await service.from("admin_dev_requests").select(`${LIST_COLUMNS}, proposed_content`).eq("id", id).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ request: data });
  }
  const { data, error } = await service.from("admin_dev_requests").select(LIST_COLUMNS).order("created_at", { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}

/** POST — 수정안(doc_edit) · 관리자 지시(doc_comment) · 역할 메모(role_note) 저장 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const kind = String(body.kind ?? "");
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (note.length > MAX_NOTE) return NextResponse.json({ error: "메모가 너무 깁니다." }, { status: 400 });

  const row: Record<string, unknown> = { kind, note: note || null, created_by: auth.userId };

  if (kind === "doc_edit" || kind === "doc_comment") {
    const path = String(body.target_path ?? "");
    if (!isAllowedDocPath(path) || !path.endsWith(".md")) return NextResponse.json({ error: "허용되지 않는 문서 경로입니다." }, { status: 400 });
    row.target_path = path;
    if (kind === "doc_comment" && !note) return NextResponse.json({ error: "지시 내용을 입력해 주세요." }, { status: 400 });
    if (kind === "doc_edit") {
      const proposed = typeof body.proposed_content === "string" ? body.proposed_content : "";
      if (!proposed.trim()) return NextResponse.json({ error: "수정본이 비어 있습니다." }, { status: 400 });
      if (proposed.length > MAX_CONTENT) return NextResponse.json({ error: "문서가 너무 커서 화면에서 고칠 수 없습니다." }, { status: 400 });
      // 기준 원문은 지금 GitHub 최신본으로 서버가 직접 기록(브라우저 값을 믿지 않음) — CLI가 3-way 병합에 쓴다
      const base = await fetchRepoText(path, 0);
      if (base == null) return NextResponse.json({ error: "원문을 읽지 못했습니다." }, { status: 502 });
      if (contentHash(base) === contentHash(proposed)) return NextResponse.json({ error: "바뀐 내용이 없습니다." }, { status: 400 });
      row.base_content = base;
      row.base_hash = contentHash(base);
      row.proposed_content = proposed;
    }
  } else if (kind === "role_note") {
    const role = String(body.target_role ?? "");
    if (!ROLE_ID_RE.test(role)) return NextResponse.json({ error: "역할 ID가 올바르지 않습니다." }, { status: 400 });
    if (!note) return NextResponse.json({ error: "메모 내용을 입력해 주세요." }, { status: 400 });
    row.target_role = role;
  } else {
    return NextResponse.json({ error: "kind는 doc_edit·doc_comment·role_note 중 하나" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service.from("admin_dev_requests").insert(row).select(LIST_COLUMNS).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ request: data });
}

/** PATCH { id } — 아직 반영 전(open)인 요청을 관리자가 취소 */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  const service = createServiceClient();
  const { data, error } = await service
    .from("admin_dev_requests")
    .update({ status: "rejected", reject_reason: "관리자 취소", handled_by: "admin", handled_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "open")
    .select(LIST_COLUMNS)
    .single();
  if (error) return NextResponse.json({ error: "이미 반영됐거나 없는 요청입니다." }, { status: 409 });
  return NextResponse.json({ request: data });
}
