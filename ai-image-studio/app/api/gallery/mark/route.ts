import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/server";
import { onceMarkNext, pickAllowed } from "@/lib/linkMark";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const AI_IMAGE_STUDIO_PROGRAM_ID = "26b9f0b2-b48b-4f9d-b751-ecb88e98e95e";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// v1.27: 본인 이미지 생성 기록에 첫 다운로드·바나나로 보낸 시각을 한 번만 남긴다(`metadata.downloadedAt`·`metadata.handoffs.banana`)
export async function POST(req: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: { id?: unknown; kind?: unknown } = {};
  try { body = await req.json(); } catch { return Response.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 }); }
  const id = typeof body.id === "string" && UUID.test(body.id) ? body.id : null;
  const kind = pickAllowed(body.kind, ["download", "banana"] as const);
  if (!id || !kind) return Response.json({ error: "바꿀 내용이 없습니다." }, { status: 400 });

  const admin = createAdminClient();
  const { data } = await admin.from("usage_logs").select("metadata")
    .eq("id", id).eq("user_id", user.id).eq("program_id", AI_IMAGE_STUDIO_PROGRAM_ID).eq("action", "image_generation").maybeSingle();
  if (!data) return Response.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });
  // 첫 1회만 저장(공용 기준 코드 `link-mark`)
  const next = onceMarkNext(data.metadata, kind === "download" ? { kind: "download" } : { kind: "handoff", to: "banana" }, new Date().toISOString());
  if (next) {
    const { error } = await admin.from("usage_logs").update({ metadata: next }).eq("id", id).eq("user_id", user.id);
    if (error) return Response.json({ error: "저장하지 못했습니다." }, { status: 500 });
  }
  return Response.json({ ok: true });
}
