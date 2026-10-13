import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { json } from "@/lib/aiRoute";
import { BUCKET, TEMP_TTL_MS, detectMedia, isOwnTempPath, sizeError, tempPath } from "@/lib/rpa/media";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** 본인 폴더의 오래된 임시 파일을 지운다(실패해도 업로드는 계속) */
async function sweep(userId: string) {
  try {
    const store = createAdminClient().storage.from(BUCKET);
    const { data } = await store.list(userId, { limit: 100 });
    const old = (data ?? []).filter((f) => f.created_at && Date.now() - new Date(f.created_at).getTime() > TEMP_TTL_MS).map((f) => `${userId}/${f.name}`);
    if (old.length) await store.remove(old);
  } catch { /* 정리 실패는 무시 */ }
}

/** 임시 업로드 서명 URL 발급 — 브라우저가 Storage로 직접 올린다(Vercel 4.5MB 본문 한도 회피) */
export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  let body: { name?: unknown; mime?: unknown; size?: unknown } = {};
  try { body = await request.json(); } catch { return json({ error: "요청 형식이 올바르지 않습니다." }, 400); }
  const name = typeof body.name === "string" ? body.name.slice(0, 200) : "";
  const det = detectMedia(name, typeof body.mime === "string" ? body.mime : "");
  if (!det) return json({ error: "지원하지 않는 파일 형식입니다. 이미지·동영상·오디오 파일을 올려 주세요." }, 400);
  const tooBig = sizeError(det.media, Number(body.size));
  if (tooBig) return json({ error: tooBig }, 413);

  await sweep(access.user.id);
  const path = tempPath(access.user.id, randomUUID(), det.ext);
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return json({ error: "업로드 준비에 실패했습니다. 잠시 후 다시 시도해 주세요." }, 500);
  return json({ path, token: data.token, media: det.media, mime: det.mime });
}

/** 임시 파일 즉시 삭제(본인 파일만) */
export async function DELETE(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const path = request.nextUrl.searchParams.get("path");
  if (!isOwnTempPath(access.user.id, path)) return json({ error: "삭제할 파일이 올바르지 않습니다." }, 400);
  await createAdminClient().storage.from(BUCKET).remove([path]);
  return json({ ok: true });
}
