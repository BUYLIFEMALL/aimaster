import { NextResponse } from "next/server";
import { authorize, requireOwnKey } from "@/lib/chat/apiGuard";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseDocument } from "@/lib/chat/upstage";
import { fileKind, isDuplicateDoc } from "@/lib/chat/core";
import { ingestDocument, IngestError, ingestStream, type IngestStage } from "@/lib/chat/ingest";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

const MAX_BYTES = 4 * 1024 * 1024; // Vercel 요청 본문 한도(4.5MB) 안
const MAX_DOCS = 30;

/** GET — 내 문서 목록 */
export async function GET() {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const { data, error } = await createAdminClient()
    .from("dcb_documents")
    .select("id, name, size_bytes, chunk_count, created_at")
    .eq("user_id", gate.auth.user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "문서 목록을 불러오지 못했습니다." }, { status: 500 });
  return NextResponse.json({ documents: data ?? [], maxDocs: MAX_DOCS, maxBytes: MAX_BYTES });
}

/** POST (multipart: file) — 문서를 읽어 조각내고 임베딩해 저장한다(원본 파일은 보관하지 않음) */
export async function POST(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const userId = gate.auth.user.id;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "올릴 파일을 선택해 주세요." }, { status: 400 });
  const name = file.name.slice(0, 200);
  const kind = fileKind(name);
  if (!kind) return NextResponse.json({ error: "지원하지 않는 형식입니다. TXT·MD·CSV·PDF·DOCX·PPTX·XLSX·HWP·이미지를 올려 주세요." }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "빈 파일입니다." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "파일은 4MB까지 올릴 수 있습니다. 큰 문서는 나눠서 올려 주세요." }, { status: 400 });

  const admin = createAdminClient();
  const limitError = await checkDocLimits(admin, userId, name, file.size);
  if (limitError) return limitError;

  const up = await requireOwnKey(userId, "upstage");
  if (!up.ok) return up.response;

  const readText = () => (kind === "text" ? file.text() : parseDocument(up.apiKey, file, name));
  const run = (onStage?: (s: IngestStage) => void) => ingestDocument({ admin, userId, apiKey: up.apiKey, name, sizeBytes: file.size, readText, onStage });

  // 화면이 진행 단계를 받겠다고 하면(U2) 한 줄 JSON으로 단계를 흘려보낸다
  if (request.headers.get("x-progress") === "1") return ingestStream(run);
  try {
    return NextResponse.json({ success: true, document: await run() });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: err instanceof IngestError ? err.status : 500 });
  }
}

/** 문서 개수 한도·같은 문서 중복(L5) 확인. 문제가 있으면 오류 응답, 없으면 null */
async function checkDocLimits(admin: ReturnType<typeof createAdminClient>, userId: string, name: string, size: number): Promise<Response | null> {
  const { data: existing } = await admin.from("dcb_documents").select("name, size_bytes").eq("user_id", userId);
  const list = existing ?? [];
  if (list.length >= MAX_DOCS) return NextResponse.json({ error: `문서는 ${MAX_DOCS}개까지 올릴 수 있습니다. 안 쓰는 문서를 지운 뒤 다시 올려 주세요.` }, { status: 400 });
  if (isDuplicateDoc(list as { name: string; size_bytes: number }[], name, size)) {
    return NextResponse.json({ error: "같은 문서(이름·크기 동일)를 이미 올렸습니다. 다시 올리려면 기존 문서를 먼저 삭제해 주세요.", duplicate: true }, { status: 409 });
  }
  return null;
}

/** DELETE ?id= — 내 문서 삭제(조각·임베딩 함께 삭제) */
export async function DELETE(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "삭제할 문서를 찾지 못했습니다." }, { status: 400 });
  const { error } = await createAdminClient().from("dcb_documents").delete().eq("id", id).eq("user_id", gate.auth.user.id);
  if (error) return NextResponse.json({ error: "문서를 삭제하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ success: true });
}
