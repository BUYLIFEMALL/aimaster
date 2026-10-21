import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { removeProjectFolder } from "@/lib/projects";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 프로젝트 30일 자동 삭제(v1.10, 생성일 기준 — 회원 생성 데이터 30일 규칙). Vercel cron(vercel.json, 매일 03:00 KST)이 부른다.
// 프로젝트 폴더(참조·마스터 이미지)를 먼저 비우고 행을 지운다. 회원당 30개 제한은 그대로 둔다.
const BATCH = 200;
const MAX_ROUNDS = 10;

export async function GET(request: Request) {
  // 비밀값이 비어 있으면 「Bearer undefined」로 통과되는 사고를 막는다(docs/ERROR_LESSONS.md 2026-10-20).
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();
  let rows = 0, files = 0;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const { data: old, error } = await admin
      .from("storyboard_projects").select("id, user_id").lt("created_at", cutoff).limit(BATCH);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!old?.length) break;
    for (const r of old) files += await removeProjectFolder(r.user_id as string, r.id as string);
    const { error: delErr } = await admin.from("storyboard_projects").delete().in("id", old.map((r) => r.id as string));
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    rows += old.length;
    if (old.length < BATCH) break;
  }
  return NextResponse.json({ ok: true, cutoff, rows, files });
}
