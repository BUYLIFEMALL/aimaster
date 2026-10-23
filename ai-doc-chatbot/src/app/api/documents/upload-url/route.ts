import { NextResponse } from "next/server";
import { authorize } from "@/lib/chat/apiGuard";
import { createAdminClient } from "@/lib/supabase/admin";
import { DIRECT_UPLOAD_MAX } from "@/lib/chat/core";
import { removeStaleUploads, UPLOAD_BUCKET, uploadPathFor } from "@/lib/chat/uploads";
import { checkDocLimits, validateUpload } from "@/lib/chat/uploadChecks";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** POST { name, size } — 4MB 넘는 문서(L2)를 화면이 비공개 버킷에 직접 올릴 수 있는 1회용 주소를 준다 */
export async function POST(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const userId = gate.auth.user.id;
  const body = (await request.json().catch(() => ({}))) as { name?: unknown; size?: unknown };
  const name = String(body.name ?? "").slice(0, 200);
  const size = Number(body.size) || 0;

  const invalid = validateUpload(name, size);
  if (invalid) return invalid;
  if (size <= DIRECT_UPLOAD_MAX) return NextResponse.json({ error: "4MB 이하 파일은 바로 올려 주세요." }, { status: 400 });

  const admin = createAdminClient();
  const limit = await checkDocLimits(admin, userId, name, size);
  if (limit) return limit;

  await removeStaleUploads(admin, userId).catch(() => undefined);
  const path = uploadPathFor(userId, name);
  const { data, error } = await admin.storage.from(UPLOAD_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: "업로드 주소를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  return NextResponse.json({ bucket: UPLOAD_BUCKET, path: data.path, token: data.token });
}
