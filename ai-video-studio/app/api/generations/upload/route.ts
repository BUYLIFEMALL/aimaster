import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/server";
import { BUCKET, toClient, type GenerationRow } from "@/lib/generations";
import { isRetentionExempt } from "@/lib/retentionExempt";
import { UPLOAD_MAX_BYTES, UPLOAD_MAX_SECONDS, UPLOAD_MODEL, uploadAspect, uploadSeconds } from "@/lib/postprocess";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 2026-11-09 내 영상 올리기(후처리용). 영상은 서버를 거치지 않고 브라우저가 일회용 주소로 회원 폴더에 바로 올린다(요청 한도 4.5MB 때문).
// step "start": 권리 확인 → 일회용 업로드 주소 / step "finish": 올라간 파일 확인 → 보관함 행(완성 상태) 저장. AI 호출 없음.
const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(request: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const admin = createAdminClient();
  const name = (typeof body.name === "string" && body.name.trim() ? body.name.trim() : "video.mp4").slice(0, 120);

  if (body.step === "start") {
    if (body.rights !== true) return NextResponse.json({ error: "내가 찍었거나 권리를 가진 영상인지 먼저 확인해 주세요." }, { status: 400 });
    const size = Number(body.size ?? 0);
    if (!/\.mp4$/i.test(name)) return NextResponse.json({ error: "MP4 영상만 올릴 수 있습니다." }, { status: 400 });
    if (!(size > 0 && size <= UPLOAD_MAX_BYTES)) return NextResponse.json({ error: `영상은 ${Math.round(UPLOAD_MAX_BYTES / 1048576)}MB 이하만 올릴 수 있습니다.` }, { status: 400 });
    const id = crypto.randomUUID();
    const path = `${user.id}/${id}/video.mp4`;
    const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) return NextResponse.json({ error: "업로드 주소를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
    return NextResponse.json({ id, path, token: data.token }, { headers: { "Cache-Control": "private, no-store" } });
  }

  if (body.step === "finish") {
    const id = String(body.id ?? "");
    if (!UUID.test(id) || body.rights !== true) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    const seconds = Number(body.seconds ?? 0);
    const path = `${user.id}/${id}/video.mp4`;
    // 실제로 올라간 파일인지(회원 폴더) 크기와 함께 확인
    const { data: files } = await admin.storage.from(BUCKET).list(`${user.id}/${id}`, { limit: 5 });
    const file = (files ?? []).find((f) => f.name === "video.mp4");
    const bytes = Number((file?.metadata as { size?: number } | undefined)?.size ?? 0);
    if (!file || !(bytes > 0)) return NextResponse.json({ error: "올린 영상을 찾지 못했습니다. 다시 올려 주세요." }, { status: 400 });
    if (!(seconds > 0 && seconds <= UPLOAD_MAX_SECONDS + 0.5)) {
      await admin.storage.from(BUCKET).remove([path]);
      return NextResponse.json({ error: `${UPLOAD_MAX_SECONDS}초 이하 영상만 올릴 수 있습니다. 영상 합치기에서 잘라 쓴 뒤 올려 주세요.` }, { status: 400 });
    }
    const { error } = await admin.from("avs_generations").insert({
      id, user_id: user.id, provider: "fal", model: UPLOAD_MODEL, status: "completed",
      prompt: `📁 ${name}`, aspect_ratio: uploadAspect(Number(body.width), Number(body.height)), duration_s: uploadSeconds(seconds),
      options: { upload: { fileName: name, rights: true, at: new Date().toISOString() } },
      outputs: [{ path, contentType: "video/mp4", bytes }], est_cost_usd: null,
    });
    if (error) {
      await admin.storage.from(BUCKET).remove([path]);
      return NextResponse.json({ error: "보관함에 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
    }
    const { data: fresh } = await admin.from("avs_generations").select("*").eq("id", id);
    return NextResponse.json({ generations: await toClient(admin, (fresh ?? []) as GenerationRow[], await isRetentionExempt(admin, user.id)) }, { headers: { "Cache-Control": "private, no-store" } });
  }
  // v1.30 올리기 실패 뒤 화면이 부른다 — 보관함 줄이 없는 내 올리기 파일만 지운다(창을 닫은 경우는 매일 정리가 맡음)
  if (body.step === "cancel") {
    const id = String(body.id ?? "");
    if (!UUID.test(id)) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    const { data: row } = await admin.from("avs_generations").select("id").eq("id", id).maybeSingle();
    if (!row) await admin.storage.from(BUCKET).remove([`${user.id}/${id}/video.mp4`]);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  }
  return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
}
