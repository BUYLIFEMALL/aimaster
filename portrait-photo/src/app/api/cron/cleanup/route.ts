import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET, expiredFilter } from "@/lib/saved";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 서버 보관함 매일 정리(v1.31): 모든 회원의 만료 사진(저장한 만료일이 지났거나 만든 지 30일 지남)을 저장소·목록에서 지운다.
// 예전엔 그 회원이 목록을 열거나 저장할 때만 지워져, 접속하지 않는 회원 사진이 30일을 넘겨 남았다. Vercel cron(vercel.json, 매일 03:00 KST).
const BATCH = 200;
const MAX_ROUNDS = 10;

export async function GET(request: Request) {
  // 비밀값이 비어 있으면 「Bearer undefined」로 통과되는 사고를 막는다(docs/ERROR_LESSONS.md 2026-10-20).
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  let rows = 0;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const { data, error } = await admin.from("portrait_photo_saved").select("id, path").or(expiredFilter()).limit(BATCH);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const list = (data ?? []) as { id: string; path: string }[];
    if (!list.length) break;
    await admin.storage.from(BUCKET).remove(list.map((r) => r.path));
    const { error: delErr } = await admin.from("portrait_photo_saved").delete().in("id", list.map((r) => r.id));
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    rows += list.length;
    if (list.length < BATCH) break;
  }
  return NextResponse.json({ ok: true, rows });
}
