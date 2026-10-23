import { NextResponse } from "next/server";
import { authorize, requireOwnKey } from "@/lib/chat/apiGuard";
import { createAdminClient } from "@/lib/supabase/admin";
import { DIRECT_UPLOAD_MAX, lastUsedByDoc, STORAGE_UPLOAD_MAX, type Source } from "@/lib/chat/core";
import { checkDocLimits, MAX_DOCS, validateUpload } from "@/lib/chat/uploadChecks";
import { IngestError, ingestStream, processFile, type IngestStage } from "@/lib/chat/ingest";
import { UPLOAD_BUCKET, removeUpload } from "@/lib/chat/uploads";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;


/** GET — 내 문서 목록 */
export async function GET() {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const admin = createAdminClient();
  const userId = gate.auth.user.id;
  const { data, error } = await admin.from("dcb_documents").select("id, name, size_bytes, chunk_count, created_at").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "문서 목록을 불러오지 못했습니다." }, { status: 500 });
  // 문서별 마지막으로 근거로 쓰인 시각 — 30일 보관 답변의 출처에서 계산
  const { data: answers } = await admin.from("dcb_messages").select("created_at, sources").eq("user_id", userId).eq("role", "assistant").order("created_at", { ascending: false }).limit(1000);
  const lastUsed = lastUsedByDoc(data ?? [], (answers ?? []) as { created_at: string; sources: Source[] }[]);
  const documents = (data ?? []).map((d) => ({ ...d, last_used_at: lastUsed[d.id] ?? null }));
  return NextResponse.json({ documents, maxDocs: MAX_DOCS, maxBytes: STORAGE_UPLOAD_MAX, directMaxBytes: DIRECT_UPLOAD_MAX });
}

/**
 * POST — 문서를 읽어 조각내고 임베딩해 저장한다(원본 파일은 보관하지 않음).
 * - multipart(file): 4MB 이하 파일을 화면에서 바로 받음
 * - JSON { storagePath, name, size }: 4MB 초과 파일(L2) — 화면이 Storage에 올린 파일을 읽고 바로 지움
 * 헤더 x-progress: 1 이면 진행 단계를 한 줄 JSON으로 흘려보낸다(U2). 100쪽 초과면 async(request_id)로 끝난다(L3).
 */
export async function POST(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const userId = gate.auth.user.id;
  const admin = createAdminClient();

  let name: string;
  let size: number;
  let getFile: () => Promise<Blob>;
  let storagePath: string | null = null;

  if ((request.headers.get("content-type") ?? "").includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as { storagePath?: unknown; name?: unknown; size?: unknown };
    const path = typeof body.storagePath === "string" ? body.storagePath : "";
    if (!path.startsWith(`${userId}/`) || path.includes("..")) return NextResponse.json({ error: "올린 파일을 찾지 못했습니다. 다시 올려 주세요." }, { status: 400 });
    storagePath = path;
    name = String(body.name ?? "").slice(0, 200);
    size = Number(body.size) || 0;
    getFile = async () => {
      const { data, error } = await admin.storage.from(UPLOAD_BUCKET).download(path);
      if (error || !data) throw new IngestError("올린 파일을 읽지 못했습니다. 다시 올려 주세요.", 400);
      return data;
    };
  } else {
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "올릴 파일을 선택해 주세요." }, { status: 400 });
    name = file.name.slice(0, 200);
    size = file.size;
    if (size > DIRECT_UPLOAD_MAX) return NextResponse.json({ error: "4MB가 넘는 파일은 화면을 새로 고친 뒤 다시 올려 주세요(큰 파일 전용 경로로 올라갑니다)." }, { status: 400 });
    getFile = async () => file;
  }

  const cleanup = async () => {
    if (storagePath) await removeUpload(admin, storagePath);
  };

  const invalid = validateUpload(name, size) ?? (await checkDocLimits(admin, userId, name, size));
  if (invalid) {
    await cleanup();
    return invalid;
  }

  const up = await requireOwnKey(userId, "upstage");
  if (!up.ok) {
    await cleanup();
    return up.response;
  }

  const run = async (onStage?: (s: IngestStage) => void) => processFile({ admin, userId, apiKey: up.apiKey, name, file: await getFile(), onStage });

  if (request.headers.get("x-progress") === "1") return ingestStream(run, cleanup);
  try {
    const out = await run();
    return NextResponse.json(out.kind === "done" ? { success: true, document: out.document } : { async: true, requestId: out.requestId });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: err instanceof IngestError ? err.status : 500 });
  } finally {
    await cleanup();
  }
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
