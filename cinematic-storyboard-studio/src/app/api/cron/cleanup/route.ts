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

// 30일 정리 기록(2026-10-23) — 회원별 usage_logs action `cleanup_expired`(메인 관리자 「30일 자동 정리」 표·「운영 상태」). 기록 실패해도 정리는 계속.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logCleanup(admin: any, counts: Map<string, Record<string, number>>) {
  try {
    if (!counts.size) return;
    const { data: program } = await admin.from("programs").select("id").eq("slug", "cinematic-storyboard-studio").maybeSingle();
    if (!program) return;
    await admin.from("usage_logs").insert([...counts].map(([user_id, m]) => ({
      user_id, program_id: program.id, action: "cleanup_expired", quantity: Object.values(m).reduce((a, b) => a + b, 0), metadata: m,
    })));
  } catch (e) {
    console.error("[cleanup] usage_logs 기록 실패:", e);
  }
}

export async function GET(request: Request) {
  // 비밀값이 비어 있으면 「Bearer undefined」로 통과되는 사고를 막는다(docs/ERROR_LESSONS.md 2026-10-20).
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();
  let rows = 0, files = 0;
  const counts = new Map<string, Record<string, number>>();

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const { data: old, error } = await admin
      .from("storyboard_projects").select("id, user_id").lt("created_at", cutoff).limit(BATCH);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!old?.length) break;
    const roundCounts = new Map<string, Record<string, number>>();
    for (const r of old) {
      const n = await removeProjectFolder(r.user_id as string, r.id as string);
      files += n;
      const c = roundCounts.get(r.user_id as string) ?? { projects: 0, images: 0 };
      c.projects += 1; c.images += n;
      roundCounts.set(r.user_id as string, c);
    }
    const { error: delErr } = await admin.from("storyboard_projects").delete().in("id", old.map((r) => r.id as string));
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    // 행 삭제가 성공한 묶음만 기록에 더함
    for (const [u, c] of roundCounts) {
      const t = counts.get(u) ?? { projects: 0, images: 0 };
      counts.set(u, { projects: t.projects + c.projects, images: t.images + c.images });
    }
    rows += old.length;
    if (old.length < BATCH) break;
  }
  await logCleanup(admin, counts);
  return NextResponse.json({ ok: true, cutoff, rows, files, loggedOwners: counts.size });
}
