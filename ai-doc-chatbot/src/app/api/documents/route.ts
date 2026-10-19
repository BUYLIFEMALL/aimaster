import { NextResponse } from "next/server";
import { authorize, requireOwnKey } from "@/lib/chat/apiGuard";
import { createAdminClient } from "@/lib/supabase/admin";
import { embed, parseDocument } from "@/lib/chat/upstage";
import { chunkText, fileKind } from "@/lib/chat/core";

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
  const { count } = await admin.from("dcb_documents").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) >= MAX_DOCS) return NextResponse.json({ error: `문서는 ${MAX_DOCS}개까지 올릴 수 있습니다. 안 쓰는 문서를 지운 뒤 다시 올려 주세요.` }, { status: 400 });

  const up = await requireOwnKey(userId, "upstage");
  if (!up.ok) return up.response;

  let text: string;
  try {
    text = kind === "text" ? await file.text() : await parseDocument(up.apiKey, file, name);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || "문서를 읽지 못했습니다." }, { status: 502 });
  }
  const chunks = chunkText(text);
  if (!chunks.length) return NextResponse.json({ error: "문서에서 읽을 수 있는 글을 찾지 못했습니다." }, { status: 400 });

  let vectors: number[][];
  try {
    vectors = await embed(up.apiKey, chunks, "passage");
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || "문서 임베딩에 실패했습니다." }, { status: 502 });
  }

  const { data: doc, error: docErr } = await admin
    .from("dcb_documents")
    .insert({ user_id: userId, name, size_bytes: file.size, chunk_count: chunks.length })
    .select("id, name, size_bytes, chunk_count, created_at")
    .single();
  if (docErr || !doc) return NextResponse.json({ error: "문서를 저장하지 못했습니다." }, { status: 500 });

  const rows = chunks.map((content, i) => ({ document_id: doc.id, user_id: userId, chunk_index: i, content, embedding: JSON.stringify(vectors[i]) }));
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await admin.from("dcb_chunks").insert(rows.slice(i, i + 100));
    if (error) {
      await admin.from("dcb_documents").delete().eq("id", doc.id).eq("user_id", userId);
      return NextResponse.json({ error: "문서 조각을 저장하지 못했습니다. 다시 시도해 주세요." }, { status: 500 });
    }
  }
  return NextResponse.json({ success: true, document: doc });
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
